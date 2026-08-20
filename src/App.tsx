import { useEffect, useState } from "react";
import type { AwardedBid, Project } from "./types";
import { PROJECTS, AWARDED_BIDS } from "./data/seed";
import { TopBar } from "./components/TopBar";
import type { WorkspaceTab } from "./components/TopBar";
import { HomeScreen } from "./screens/HomeScreen";
import { ProjectsScreen } from "./screens/ProjectsScreen";
import { ProjectScreen } from "./screens/ProjectScreen";
import { IntakeScreen } from "./screens/IntakeScreen";

type Screen = "home" | "projects" | "project" | "intake";

const WORKSPACE: Screen[] = ["home", "projects"];

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [projects, setProjects] = useState<Project[]>(PROJECTS);
  const [awardedBids, setAwardedBids] = useState<AwardedBid[]>(AWARDED_BIDS);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeAwardId, setActiveAwardId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const activeAward = awardedBids.find((a) => a.id === activeAwardId);
  const isWorkspace = WORKSPACE.includes(screen);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  function updateProject(next: Project) {
    setProjects((prev) => prev.map((p) => (p.id === next.id ? next : p)));
  }

  const tabs: WorkspaceTab[] = [
    { id: "projects", label: "Projects", count: projects.length },
  ];

  function createFromAward(project: Project) {
    setProjects((prev) => [project, ...prev]);
    setAwardedBids((prev) => prev.filter((a) => a.id !== activeAwardId));
    setActiveAwardId(null);
    setActiveProjectId(project.id);
    setScreen("projects");
    setToast(`${project.id} created and added to your portfolio`);
  }

  const backConfig =
    screen === "project" || screen === "intake"
      ? { onBack: () => setScreen("projects"), backLabel: "Projects" }
      : {};

  return (
    <div className="flex min-h-full flex-col">
      {isWorkspace ? (
        <TopBar tabs={tabs} activeTab={screen} onTab={(id) => setScreen(id as Screen)} />
      ) : (
        <TopBar {...backConfig} />
      )}

      {screen === "home" && <HomeScreen onLogin={() => setScreen("projects")} />}

      {screen === "projects" && (
        <ProjectsScreen
          projects={projects}
          awardedBids={awardedBids}
          onOpen={(id) => {
            setActiveProjectId(id);
            setScreen("project");
          }}
          onIntake={(id) => {
            setActiveAwardId(id);
            setScreen("intake");
          }}
          onLocked={() =>
            setToast(
              "Detailed workspace is seeded for the Aaple Sarkar 2.0 project",
            )
          }
        />
      )}

      {screen === "project" && activeProject && (
        <ProjectScreen
          project={activeProject}
          onUpdate={updateProject}
          onToast={setToast}
        />
      )}

      {screen === "intake" && activeAward && (
        <IntakeScreen
          award={activeAward}
          onCreate={createFromAward}
          onDecline={() => {
            setActiveAwardId(null);
            setScreen("projects");
            setToast("Award declined");
          }}
        />
      )}

      {toast && (
        <div className="animate-fade fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
