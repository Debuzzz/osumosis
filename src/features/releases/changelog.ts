export type ChangelogRelease = {
  date?: string;
  sections: { title: string; changes: string[] }[];
};

export function getChangelogRelease(changelog: string, version: string): ChangelogRelease | null {
  const lines = changelog.split(/\r?\n/);
  const heading = /^## \[(.+?)\](?:\s+-\s+(.+))?\s*$/;
  const start = lines.findIndex((line) => heading.exec(line)?.[1] === version);
  if (start < 0) return null;

  const match = heading.exec(lines[start]);
  const end = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  const releaseLines = lines.slice(start + 1, end < 0 ? undefined : end);
  const sections: ChangelogRelease["sections"] = [];
  let section: ChangelogRelease["sections"][number] | undefined;

  for (const line of releaseLines) {
    if (line.startsWith("### ")) {
      section = { title: line.slice(4).trim(), changes: [] };
      sections.push(section);
    } else if (section) {
      const change = /^-\s+(.+)$/.exec(line);
      if (change) section.changes.push(change[1]);
    }
  }

  return { date: match?.[2], sections: sections.filter(({ changes }) => changes.length > 0) };
}
