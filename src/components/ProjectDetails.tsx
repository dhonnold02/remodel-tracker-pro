import { ProjectData } from "@/types/project";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, MapPin, CalendarDays } from "lucide-react";

interface ProjectDetailsProps {
  data: ProjectData;
  onChange: (data: Partial<ProjectData>) => void;
}

const ProjectDetails = ({ data, onChange }: ProjectDetailsProps) => {
  return (
    <div className="premium-card p-6 space-y-5">
      <h2 className="section-title flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        Project Details
      </h2>
      <div className="space-y-4">
        <div>
          <Label htmlFor="name" className="text-xs text-muted-foreground font-medium">Project Name</Label>
          <Input
            id="name"
            placeholder="Kitchen Remodel"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="mt-1.5 rounded-xl h-10"
          />
        </div>
        <div>
          <Label htmlFor="address" className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Job Address
          </Label>
          <textarea
            id="address"
            placeholder="123 Main St&#10;Apt 4B&#10;New York, NY 10001"
            value={(data as any).address || ""}
            onChange={(e) => onChange({ address: e.target.value } as any)}
            rows={2}
            className="mt-1.5 flex w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="start" className="text-xs text-muted-foreground font-medium flex items-center gap-1">
              <CalendarDays className="h-3 w-3" /> Start Date
            </Label>
            <Input
              id="start"
              type="date"
              value={data.startDate}
              onChange={(e) => onChange({ startDate: e.target.value })}
              className="mt-1.5 rounded-xl h-10"
            />
          </div>
          <div>
            <Label htmlFor="end" className="text-xs text-muted-foreground font-medium">Est. End Date</Label>
            <Input
              id="end"
              type="date"
              value={data.endDate}
              onChange={(e) => onChange({ endDate: e.target.value })}
              className="mt-1.5 rounded-xl h-10"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;
