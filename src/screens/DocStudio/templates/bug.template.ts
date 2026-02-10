import bugTemplateData from "./bug.json";

type BugTemplateSection = {
  heading: string;
  body: string;
};

type BugTemplateSchema = {
  title: string;
  intro?: string;
  sections: BugTemplateSection[];
};

const data = bugTemplateData as BugTemplateSchema;

export const bugTemplate = [
  `# ${data.title}`,
  "",
  data.intro ?? "",
  "",
  ...data.sections.flatMap((section) => [
    `## ${section.heading}`,
    section.body ?? "",
    "",
  ]),
].join("\n").trimEnd();
