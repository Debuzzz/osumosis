import Database from "better-sqlite3";

export function createLocalMapInsert(db: Database.Database) {
  const insertMap =
    db.prepare(`INSERT INTO maps(checksum,beatmap_id,set_id,set_key,title,artist,creator,version,mode,status,stars,bpm,length,ar,od,cs,hp,objects,tags,source,local,played,last_played,file_path,background_path,audio_path,preview,file_size,file_mtime,generation,indexed_at)
VALUES(@checksum,@beatmap_id,@set_id,@set_key,@title,@artist,@creator,@version,@mode,@status,@stars,@bpm,@length,@ar,@od,@cs,@hp,@objects,@tags,@source,1,@played,@last_played,@file_path,@background_path,@audio_path,@preview,@file_size,@file_mtime,@generation,@indexed_at)
ON CONFLICT(checksum) DO UPDATE SET beatmap_id=excluded.beatmap_id,set_id=excluded.set_id,set_key=excluded.set_key,title=excluded.title,artist=excluded.artist,creator=excluded.creator,version=excluded.version,mode=excluded.mode,
status=CASE WHEN excluded.status='unknown' THEN maps.status ELSE excluded.status END, stars=COALESCE(excluded.stars,maps.stars),bpm=excluded.bpm,length=excluded.length,ar=excluded.ar,od=excluded.od,cs=excluded.cs,hp=excluded.hp,objects=excluded.objects,tags=excluded.tags,source=excluded.source,
local=1,played=MAX(maps.played,excluded.played),last_played=COALESCE(excluded.last_played,maps.last_played),file_path=excluded.file_path,background_path=excluded.background_path,audio_path=excluded.audio_path,preview=excluded.preview,file_size=excluded.file_size,file_mtime=excluded.file_mtime,generation=excluded.generation,indexed_at=excluded.indexed_at`);
  return insertMap;
}
