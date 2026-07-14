import { WorkspacePage } from "@/features/workspace/workspace-page";

type PageProps = {
  params: Promise<{ segments: string[] }>;
};

export default async function CatchAllWorkspacePage({ params }: PageProps) {
  const { segments } = await params;
  return <WorkspacePage segments={segments} />;
}
