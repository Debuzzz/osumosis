import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const beatmap = `osu file format v14
[General]
AudioFilename: media/song.ogg
Mode: 0
PreviewTime: 1000
[Metadata]
Title: Local fixture
Artist: Test artist
Creator: Test mapper
Version: Test difficulty
BeatmapID: 123
BeatmapSetID: 456
[Difficulty]
HPDrainRate: 5
CircleSize: 4
OverallDifficulty: 6
ApproachRate: 7
SliderMultiplier: 1.4
SliderTickRate: 1
[Events]
0,0,"background.jpg",0,0
[TimingPoints]
0,500,4,2,0,100,1,0
[HitObjects]
64,64,1000,1,0,0:0:0:0:
128,128,1500,2,0,B|256:128,1,140
256,192,2500,1,0,0:0:0:0:
384,64,3000,2,0,B|128:256,2,280
256,192,5500,1,0,0:0:0:0:
`;
export const md5 = (content: string | Buffer) => createHash("md5").update(content).digest("hex");
export async function storeLazerFile(root: string, content: string) {
  const hash = createHash("sha256").update(content).digest("hex");
  const file = path.join(root, hash[0], hash.slice(0, 2), hash);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
  return { hash, file };
}
