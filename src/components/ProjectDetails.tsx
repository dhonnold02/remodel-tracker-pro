import { ProjectData } from "@/types/project";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProjectDetailsProps {
  data: ProjectData;
  onChange: (data: Partial<ProjectData>) => void;
}

const ProjectDetails = ({ data, onChange }: ProjectDetailsProps) => {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <h2 className="font-heading text-lg font-semibold text-foreground">Project Details</h2>
      <div className="space-y-3">
        <div>
          <Label htmlFor="name" className="text-sm text-muted-foreground">Project Name</Label>
          <Input
            id="name"
            placeholder="Kitchen Remodel"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="mt-1"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="start" className="text-sm text-muted-foreground">Start Date</Label>
            <Input
              id="start"
              type="date"
              value={data.startDate}
              onChange={(e) => onChange({ startDate: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="end" className="text-sm text-muted-foreground">Est. End Date</Label>
            <Input
              id="end"
              type="date"
              value={data.endDate}
              onChange={(e) => onChange({ endDate: e.target.value })}
              className="mt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;
