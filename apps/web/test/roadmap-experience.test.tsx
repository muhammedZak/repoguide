import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { RoadmapExperience } from "../app/roadmap-experience";
import { RoadmapResponse } from "../app/roadmap-response";

const roadmapResponse: RoadmapResponse = {
  repository: {
    fullName: "example/project",
    description: "A small project used to test the roadmap experience.",
    primaryLanguage: "TypeScript",
  },
  planning: {
    interviewDate: "2099-09-03",
    availableDays: 60,
    plannedDays: 30,
    dailyStudyMinutes: 120,
    totalAvailableMinutes: 3600,
    planningWindowTruncated: true,
  },
  roadmap: {
    title: "Your repository learning roadmap",
    repositorySummary: "Learn the structure before following request flow.",
    totalEstimatedMinutes: 160,
    days: [
      {
        day: 1,
        title: "Understand the project structure",
        estimatedMinutes: 100,
        modules: [
          {
            id: "project-structure-module",
            title: "Project Structure",
            description: "Learn how the main folders are organized.",
            estimatedMinutes: 40,
            difficulty: "beginner",
            learningTopicId: "project-structure",
          },
          {
            id: "request-flow-module",
            title: "Request Flow",
            description: "Follow a request through the application.",
            estimatedMinutes: 60,
            difficulty: "intermediate",
            learningTopicId: "request-flow",
          },
        ],
      },
    ],
    finalReview: {
      estimatedMinutes: 60,
      topics: ["project-structure"],
    },
  },
};

function createResponse(body: unknown, status = 200) {
  return {
    json: vi.fn().mockResolvedValue(body),
    ok: status >= 200 && status < 300,
    status,
  } as unknown as Response;
}

function createDeferred<Value>() {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

function fillForm(language: "english" | "malayalam" = "english") {
  fireEvent.change(screen.getByLabelText("GitHub repository URL"), {
    target: { value: "https://github.com/example/project" },
  });
  fireEvent.change(screen.getByLabelText("Interview date"), {
    target: { value: "2099-09-03" },
  });
  fireEvent.change(screen.getByLabelText("Study time per day"), {
    target: { value: "120" },
  });

  if (language === "malayalam") {
    fireEvent.click(screen.getByLabelText("Malayalam"));
  }
}

describe("roadmap experience", () => {
  test("submits the complete English request and blocks duplicate submissions while loading", async () => {
    const deferred = createDeferred<Response>();
    const fetchMock = vi.fn().mockReturnValue(deferred.promise);
    vi.stubGlobal("fetch", fetchMock);
    render(<RoadmapExperience />);
    fillForm();

    fireEvent.click(screen.getByRole("button", { name: "Analyze Repository" }));

    const loadingButton = screen.getByRole("button", {
      name: "Creating roadmap...",
    }) as HTMLButtonElement;
    expect(loadingButton.disabled).toBe(true);
    expect(
      screen.getByText(
        "Analyzing your repository and creating your learning roadmap...",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Reading repository structure")).toBeTruthy();

    fireEvent.submit(loadingButton.closest("form") as HTMLFormElement);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(fetchMock.mock.calls[0][0]).toBe("/api/roadmaps/generate");
    expect(JSON.parse(String(request.body))).toEqual({
      repoUrl: "https://github.com/example/project",
      interviewDate: "2099-09-03",
      dailyStudyMinutes: 120,
      language: "english",
    });

    deferred.resolve(createResponse(roadmapResponse));
    expect(await screen.findByText("example/project")).toBeTruthy();
  });

  test("renders the complete public roadmap and returns to the input flow", async () => {
    const responseWithPrivateData = {
      ...roadmapResponse,
      repositoryDocuments: [{ content: "PRIVATE SOURCE CONTENT" }],
      repositoryManifest: { internal: true },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(createResponse(responseWithPrivateData)),
    );
    const { container } = render(<RoadmapExperience />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Analyze Repository" }));

    expect(
      await screen.findByRole("heading", {
        name: "Your repository learning roadmap",
      }),
    ).toBeTruthy();
    expect(
      screen.getByText("Learn the structure before following request flow."),
    ).toBeTruthy();
    expect(screen.getByText("TypeScript")).toBeTruthy();
    expect(screen.getByText("September 3, 2099")).toBeTruthy();
    expect(screen.getByText("2 hours/day")).toBeTruthy();
    expect(screen.getByText("1 hr 40 min")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Understand the project structure" }),
    ).toBeTruthy();
    expect(screen.getAllByText("Project Structure").length).toBe(2);
    expect(screen.getByText("40 min")).toBeTruthy();
    expect(screen.getByText("Beginner")).toBeTruthy();
    expect(screen.getByText("Intermediate")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Final review" })).toBeTruthy();
    expect(
      screen.getByText(
        "Your interview is farther away, so this roadmap focuses on the first 30 study days.",
      ),
    ).toBeTruthy();
    expect(container.textContent).not.toContain("project-structure");
    expect(container.textContent).not.toContain("PRIVATE SOURCE CONTENT");
    expect(container.textContent).not.toContain("repositoryManifest");

    fireEvent.click(
      screen.getByRole("button", { name: "Analyze another repository" }),
    );
    expect(
      screen.getByRole("button", { name: "Analyze Repository" }),
    ).toBeTruthy();
  });

  test("shows safe API feedback and preserves form values for retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createResponse({ error: "RAW PROVIDER DETAILS" }, 404),
      ),
    );
    render(<RoadmapExperience />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Analyze Repository" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "We couldn't access that repository.",
    );
    expect(screen.queryByText("RAW PROVIDER DETAILS")).toBeNull();
    expect(
      (screen.getByLabelText("GitHub repository URL") as HTMLInputElement)
        .value,
    ).toBe("https://github.com/example/project");
    expect(
      (screen.getByLabelText("Interview date") as HTMLInputElement).value,
    ).toBe("2099-09-03");
    expect(
      (screen.getByLabelText("Study time per day") as HTMLSelectElement).value,
    ).toBe("120");
    expect(
      screen.getByRole("button", { name: "Analyze Repository" }),
    ).toBeTruthy();
  });

  test("sends Malayalam and renders generated Unicode content unchanged", async () => {
    const malayalamResponse = structuredClone(roadmapResponse);
    malayalamResponse.roadmap.title = "നിങ്ങളുടെ പഠന പദ്ധതി";
    malayalamResponse.roadmap.repositorySummary =
      "പ്രോജക്റ്റിന്റെ ഘടന ആദ്യം പഠിക്കുക.";
    malayalamResponse.roadmap.days[0].title = "പ്രോജക്റ്റ് ഘടന മനസ്സിലാക്കുക";
    const fetchMock = vi
      .fn()
      .mockResolvedValue(createResponse(malayalamResponse));
    vi.stubGlobal("fetch", fetchMock);
    render(<RoadmapExperience />);
    fillForm("malayalam");
    fireEvent.click(screen.getByRole("button", { name: "Analyze Repository" }));

    expect(await screen.findByText("നിങ്ങളുടെ പഠന പദ്ധതി")).toBeTruthy();
    expect(screen.getByText("പ്രോജക്റ്റിന്റെ ഘടന ആദ്യം പഠിക്കുക.")).toBeTruthy();
    expect(screen.getByText("പ്രോജക്റ്റ് ഘടന മനസ്സിലാക്കുക")).toBeTruthy();
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(request.body)).language).toBe("malayalam");
  });

  test("rejects malformed success responses with safe feedback", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(createResponse({ roadmap: "not-valid" })),
    );
    render(<RoadmapExperience />);
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Analyze Repository" }));

    expect((await screen.findByRole("alert")).textContent).toContain(
      "unexpected response",
    );
  });
});
