import { Card, CardContent } from "@/components/ui/card";
import { WebsiteAnalysis } from "@/lib/types";
import CompetitorAnalysis from "../CompetitorAnalysis";

interface CompetitorTabProps {
  analysis: WebsiteAnalysis;
}

const CompetitorTab = ({ analysis }: CompetitorTabProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <CompetitorAnalysis analysis={analysis} />
      </CardContent>
    </Card>
  );
};

export default CompetitorTab;