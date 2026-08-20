import { useEffect, useState } from "react";
import { PROJECTS, projectById } from "./data/seed";
import { TopBar } from "./components/TopBar";
import type { WorkspaceTab } from "./components/TopBar";
import { HomeScreen } from "./screens/HomeScreen";
import { ProjectsScreen } from "./screens/ProjectsScreen";
import { ProjectScreen } from "./screens/ProjectScreen";

type Screen = "home" | "projects" | "project";

const WORKSPACE: Screen[] = ["home", "projects"];

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const activeProject = projectById(activeProjectId);
  const isWorkspace = WORKSPACE.includes(screen);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const tabs: WorkspaceTab[] = [
    { id: "projects", label: "Projects", count: PROJECTS.length },
  ];

  const backConfig =
    screen === "project"
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
          onOpen={(id) => {
            setActiveProjectId(id);
            setScreen("project");
          }}
          onLocked={() =>
            setToast(
              "Detailed workspace is seeded for the Aaple Sarkar 2.0 project",
            )
          }
        />
      )}

      {screen === "project" && activeProject && (
        <ProjectScreen project={activeProject} />
      )}

      {toast && (
        <div className="animate-fade fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
