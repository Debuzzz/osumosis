#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{fs, io::{Read, Write}, net::TcpListener, path::PathBuf, sync::{Mutex, atomic::{AtomicBool, Ordering}}, time::{Duration, Instant}};
use tauri::{Manager, RunEvent, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};
use tauri_plugin_shell::{ShellExt, process::{CommandChild, CommandEvent}};

struct Backend { child: Mutex<Option<CommandChild>>, data: PathBuf, instance: String, ready: AtomicBool, exiting: AtomicBool }

fn kill_backend(backend: &Backend) {
    let child = backend.child.lock().unwrap().take();
    if let Some(child) = child { let _ = child.kill(); }
}

fn marker_matches(data: &PathBuf, instance: &str) -> bool {
    fs::read_to_string(data.join("service.json")).ok()
        .and_then(|text| serde_json::from_str::<serde_json::Value>(&text).ok())
        .map(|value| value["instance"].as_str() == Some(instance) && value["port"].as_u64() == Some(3000)).unwrap_or(false)
}

fn start_backend(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let data = app.path().app_data_dir()?;
    fs::create_dir_all(&data)?;
    let probe = TcpListener::bind("127.0.0.1:3000").map_err(|_| std::io::Error::new(std::io::ErrorKind::AddrInUse, "Port 3000 is already in use. Stop npm start / the other osu!mosis instance, then launch again."))?;
    drop(probe);
    let backend = app.path().resource_dir()?.join("backend");
    let instance = uuid::Uuid::new_v4().to_string();
    let (mut events, child) = app.shell().sidecar("osumosis-node")?
        .args([backend.join("dist/server/index.js").to_string_lossy().into_owned()])
        .current_dir(&backend).env("OSUMOSIS_DATA", &data).env("OSUMOSIS_PORT", "3000")
        .env("OSUMOSIS_DESKTOP_INSTANCE", &instance).env("NODE_ENV", "production").env("NODE_OPTIONS", "").spawn()?;
    app.manage(Backend { child: Mutex::new(Some(child)), data: data.clone(), instance: instance.clone(), ready: AtomicBool::new(false), exiting: AtomicBool::new(false) });
    let handle = app.handle().clone();
    let log_file = data.join("desktop-backend.log");
    tauri::async_runtime::spawn(async move {
        while let Some(event) = events.recv().await {
            match event {
                CommandEvent::Stdout(bytes) | CommandEvent::Stderr(bytes) => {
                    if fs::metadata(&log_file).map(|m| m.len() > 512 * 1024).unwrap_or(false) {
                        let previous = log_file.with_extension("log.1"); let _ = fs::remove_file(&previous); let _ = fs::rename(&log_file, previous);
                    }
                    if let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(&log_file) { let _ = file.write_all(&bytes); let _ = file.write_all(b"\n"); }
                }
                CommandEvent::Terminated(_) => {
                    let backend = handle.state::<Backend>();
                    if backend.ready.load(Ordering::Relaxed) && !backend.exiting.load(Ordering::Relaxed) {
                        handle.dialog().message("The local backend stopped unexpectedly. Check desktop-backend.log in the application data directory.").title("osu!mosis").kind(MessageDialogKind::Error).blocking_show();
                        handle.exit(1);
                    }
                    break;
                }
                _ => {}
            }
        }
    });
    let deadline = Instant::now() + Duration::from_secs(30);
    loop {
        if marker_matches(&data, &instance) { break; }
        if Instant::now() > deadline {
            kill_backend(&app.state::<Backend>());
            return Err(std::io::Error::new(std::io::ErrorKind::TimedOut, format!("Local backend did not start. See {}", data.join("desktop-backend.log").display())).into());
        }
        std::thread::sleep(Duration::from_millis(100));
    }
    app.state::<Backend>().ready.store(true, Ordering::Relaxed);
    WebviewWindowBuilder::new(app, "main", WebviewUrl::External("http://127.0.0.1:3000".parse()?))
        .title("osu!mosis").inner_size(1280.0, 860.0).min_inner_size(420.0, 600.0)
        .on_navigation(|url| url.scheme() == "http" && url.host_str() == Some("127.0.0.1") && url.port_or_known_default() == Some(3000))
        .build()?;
    Ok(())
}

fn main() {
    let app = tauri::Builder::default().plugin(tauri_plugin_shell::init()).plugin(tauri_plugin_opener::init()).plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            if let Err(error) = start_backend(app) {
                if let Some(backend) = app.try_state::<Backend>() { backend.exiting.store(true, Ordering::Relaxed); kill_backend(&backend); }
                let handle = app.handle().clone();
                app.dialog().message(error.to_string()).title("osu!mosis").kind(MessageDialogKind::Error).show(move |_| handle.exit(1));
            }
            Ok(())
        }).build(tauri::generate_context!()).expect("Unable to initialize osu!mosis desktop.");
    app.run(|handle, event| {
        if let RunEvent::Exit = event {
            let Some(backend) = handle.try_state::<Backend>() else { return; };
            backend.exiting.store(true, Ordering::Relaxed);
            if marker_matches(&backend.data, &backend.instance) {
                if let Ok(mut stream) = std::net::TcpStream::connect_timeout(&"127.0.0.1:3000".parse().unwrap(), Duration::from_secs(1)) {
                    let _ = stream.set_read_timeout(Some(Duration::from_secs(1)));
                    let request = format!("POST /api/shutdown HTTP/1.1\r\nHost: 127.0.0.1:3000\r\nX-osumosis: 1\r\nX-osumosis-instance: {}\r\nContent-Type: application/json\r\nContent-Length: 2\r\nConnection: close\r\n\r\n{{}}", backend.instance);
                    let _ = stream.write_all(request.as_bytes()); let mut response = Vec::new(); let _ = stream.read_to_end(&mut response);
                }
                let deadline = Instant::now() + Duration::from_secs(5);
                while marker_matches(&backend.data, &backend.instance) && Instant::now() < deadline { std::thread::sleep(Duration::from_millis(100)); }
            }
            kill_backend(&backend);
        }
    });
}
