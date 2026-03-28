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
        <div>
          <Label htmlFor="address" className="text-sm text-muted-foreground">Job Address</Label>
          <textarea
            id="address"
            placeholder="123 Main St&#10;Apt 4B&#10;New York, NY 10001"
            value={(data as any).address || ""}
            onChange={(e) => onChange({ address: e.target.value } as any)}
            rows={2}
            className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
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
