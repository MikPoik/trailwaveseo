import type { Request, Response } from "express";
import { storage } from "../storage";

/**
 * Comprehensive CSV Export for SEO Analysis
 * Exports all analysis data including enhanced insights, competitor analysis, content quality, etc.
 */

// Helper function to escape CSV values and handle arrays/objects
const csvEscape = (value: any): string => {
  if (value === null || value === undefined) return '""';
  if (typeof value === 'object') {
    return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
  }
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
};

// Helper function to safely format numbers
const formatNumber = (value: any): string => {
  if (typeof value === 'number') return value.toString();
  return '0';
};

// Helper function to safely format percentages
const formatPercentage = (value: any): string => {
  if (typeof value === 'number') return `${Math.round(value)}%`;
  return 'N/A';
};

// Helper function to join array items safely
const joinArray = (arr: any[], separator: string = '; '): string => {
  if (!Array.isArray(arr)) return '';
  return arr.filter(item => item != null).join(separator);
};

export async function exportAnalysisCSV(req: Request, res: Response) {
  try {
    const userId = (req as any).user.claims.sub;
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid analysis ID" });
    }

    const analysis = await storage.getAnalysisById(id) as any;

    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }

    // Check if the analysis belongs to the authenticated user
    if (analysis.userId && analysis.userId !== userId) {
      return res.status(403).json({ error: "You don't have permission to access this analysis" });
    }

    // Create comprehensive CSV with multiple sheets worth of data
    let csv = '';

    // === ANALYSIS OVERVIEW SECTION ===
    csv += "=== ANALYSIS OVERVIEW ===\n";
    csv += "Domain,Analysis Date,Pages Analyzed,Critical Issues,Warnings,Good Practices,Average Content Score\n";
    csv += [
      csvEscape(analysis.domain),
      csvEscape(new Date(analysis.date).toLocaleDateString()),
      csvEscape(analysis.pagesCount || 0),
      csvEscape((analysis.metrics as any)?.criticalIssues || 0),
      csvEscape((analysis.metrics as any)?.warnings || 0),
      csvEscape((analysis.metrics as any)?.goodPractices || 0),
      csvEscape(formatPercentage((analysis.metrics as any)?.averageContentScore))
    ].join(',') + '\n\n';

    // === SITE OVERVIEW SECTION ===
    if (analysis.siteOverview) {
      csv += "=== SITE OVERVIEW ===\n";
      csv += "Business Type,Target Audience,Primary Goals,Content Strategy\n";
      csv += [
        csvEscape((analysis.siteOverview as any)?.businessType || 'Not determined'),
        csvEscape((analysis.siteOverview as any)?.targetAudience || 'Not determined'),
        csvEscape((analysis.siteOverview as any)?.primaryGoals || 'Not determined'),
        csvEscape((analysis.siteOverview as any)?.contentStrategy || 'Not determined')
      ].join(',') + '\n';

      if ((analysis.siteOverview as any)?.keyStrengths?.length > 0) {
        csv += "\nKey Strengths\n";
        (analysis.siteOverview as any).keyStrengths.forEach((strength: string) => {
          csv += csvEscape(strength) + '\n';
        });
      }

      if ((analysis.siteOverview as any)?.improvementAreas?.length > 0) {
        csv += "\nImprovement Areas\n";
        (analysis.siteOverview as any).improvementAreas.forEach((area: string) => {
          csv += csvEscape(area) + '\n';
        });
      }
      csv += '\n';
    }

    // === CONTENT QUALITY ANALYSIS SECTION ===
    if (analysis.contentQualityAnalysis) {
      csv += "=== CONTENT QUALITY ANALYSIS ===\n";
      csv += "Content Score,Keyword Score,Quality Score,Uniqueness Score,Total Duplicates,Pages Analyzed\n";
      csv += [
        csvEscape(formatPercentage((analysis.contentQualityAnalysis as any)?.overallHealth?.contentScore)),
        csvEscape(formatPercentage((analysis.contentQualityAnalysis as any)?.overallHealth?.keywordScore)),
        csvEscape(formatPercentage((analysis.contentQualityAnalysis as any)?.overallHealth?.qualityScore)),
        csvEscape(formatPercentage((analysis.contentQualityAnalysis as any)?.contentUniqueness?.uniquenessScore)),
        csvEscape((analysis.contentQualityAnalysis as any)?.contentUniqueness?.totalDuplicates || 0),
        csvEscape((analysis.contentQualityAnalysis as any)?.contentUniqueness?.pagesAnalyzed || 0)
      ].join(',') + '\n\n';

      // Strategic Recommendations
      if ((analysis.contentQualityAnalysis as any)?.strategicRecommendations?.length > 0) {
        csv += "Strategic Recommendations - Priority,Category,Title,Description,Implementation,Expected Impact\n";
        (analysis.contentQualityAnalysis as any).strategicRecommendations.forEach((rec: any) => {
          csv += [
            csvEscape(rec.priority || 'Medium'),
            csvEscape(rec.category || 'General'),
            csvEscape(rec.title || ''),
            csvEscape(rec.description || ''),
            csvEscape(rec.implementation || ''),
            csvEscape(rec.expectedImpact || '')
          ].join(',') + '\n';
        });
        csv += '\n';
      }
    }

    // === COMPETITOR ANALYSIS SECTION ===
    if (analysis.competitorAnalysis) {
      csv += "=== COMPETITOR ANALYSIS ===\n";
      csv += "Metric,Your Site,Competitor,Difference,Performance\n";
      
      if ((analysis.competitorAnalysis as any)?.comparison) {
        Object.entries((analysis.competitorAnalysis as any).comparison).forEach(([key, value]: [string, any]) => {
          csv += [
            csvEscape(key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())),
            csvEscape(value.yours || 'N/A'),
            csvEscape(value.competitor || 'N/A'),
            csvEscape(value.difference || 0),
            csvEscape(value.difference > 0 ? 'Better' : value.difference < 0 ? 'Worse' : 'Equal')
          ].join(',') + '\n';
        });
      }

      if ((analysis.competitorAnalysis as any)?.recommendations?.length > 0) {
        csv += '\nCompetitor Recommendations\n';
        (analysis.competitorAnalysis as any).recommendations.forEach((rec: string) => {
          csv += csvEscape(rec) + '\n';
        });
      }
      csv += '\n';
    }

    // === ENHANCED INSIGHTS SECTION ===
    if (analysis.enhancedInsights) {
      csv += "=== ENHANCED AI INSIGHTS ===\n";
      
      if ((analysis.enhancedInsights as any)?.technicalSeoInsights) {
        csv += "Technical SEO Insights\n";
        csv += "Performance Analysis,Mobile Optimization,Technical Recommendations\n";
        csv += [
          csvEscape((analysis.enhancedInsights as any).technicalSeoInsights.performanceAnalysis || 'Not available'),
          csvEscape((analysis.enhancedInsights as any).technicalSeoInsights.mobileOptimization || 'Not available'),
          csvEscape(joinArray((analysis.enhancedInsights as any).technicalSeoInsights.technicalRecommendations || []))
        ].join(',') + '\n\n';
      }

      if ((analysis.enhancedInsights as any)?.contentQualityInsights) {
        csv += "Content Quality Insights\n";
        csv += "Content Strategy,User Experience,Content Recommendations\n";
        csv += [
          csvEscape((analysis.enhancedInsights as any).contentQualityInsights.contentStrategy || 'Not available'),
          csvEscape((analysis.enhancedInsights as any).contentQualityInsights.userExperience || 'Not available'),
          csvEscape(joinArray((analysis.enhancedInsights as any).contentQualityInsights.contentRecommendations || []))
        ].join(',') + '\n\n';
      }

      if ((analysis.enhancedInsights as any)?.linkArchitectureInsights) {
        csv += "Link Architecture Insights\n";
        csv += "Internal Linking,Navigation Structure,Link Recommendations\n";
        csv += [
          csvEscape((analysis.enhancedInsights as any).linkArchitectureInsights.internalLinking || 'Not available'),
          csvEscape((analysis.enhancedInsights as any).linkArchitectureInsights.navigationStructure || 'Not available'),
          csvEscape(joinArray((analysis.enhancedInsights as any).linkArchitectureInsights.linkRecommendations || []))
        ].join(',') + '\n\n';
      }
    }

    // === DETAILED PAGE ANALYSIS SECTION ===
    csv += "=== DETAILED PAGE ANALYSIS ===\n";
    csv += [
      "Page Name", "URL", "Title", "Title Length", "Meta Description", "Description Length",
      "Canonical URL", "Robots Meta", "HTML Lang", "Viewport", "Mobile Optimized",
      "Word Count", "Readability Score", "Content Depth", "Headings Count", "Images Count",
      "Internal Links", "External Links", "Issues Count", "Critical Issues", "Warning Issues",
      "Info Issues", "Suggestions Count", "Top Keywords", "Semantic Keywords",
      "Open Graph Title", "Open Graph Description", "Open Graph Image", "Open Graph Type",
      "Twitter Card", "Twitter Title", "Twitter Description", "Twitter Image",
      "AI Suggestions", "Issue Details", "Image Analysis Summary"
    ].join(',') + '\n';

    // Process each page with comprehensive data
    (analysis.pages as any[])?.forEach((page: any) => {
      // Count issues by severity
      const criticalIssues = page.issues?.filter((issue: any) => issue.severity === 'critical')?.length || 0;
      const warningIssues = page.issues?.filter((issue: any) => issue.severity === 'warning')?.length || 0;
      const infoIssues = page.issues?.filter((issue: any) => issue.severity === 'info')?.length || 0;

      // Extract top keywords
      const topKeywords = page.keywordDensity?.slice(0, 5)?.map((kw: any) => 
        `${kw.keyword}:${kw.count}(${(kw.density * 100).toFixed(1)}%)`
      )?.join('; ') || '';

      // Extract semantic keywords
      const semanticKeywords = page.semanticKeywords?.slice(0, 10)?.join('; ') || '';

      // Summarize image analysis
      const imageAnalysis = page.images?.length > 0 ? 
        `${page.images.length} images, ${page.images.filter((img: any) => img.alt).length} with alt text, ${page.images.filter((img: any) => img.suggestedAlt).length} AI suggestions` : 
        'No images';

      // Format issue details
      const issueDetails = page.issues?.map((issue: any) => 
        `[${issue.severity.toUpperCase()}] ${issue.title}: ${issue.description}`
      )?.join(' | ') || '';

      const row = [
        csvEscape(page.pageName || 'Unknown'),
        csvEscape(page.url),
        csvEscape(page.title || ''),
        csvEscape(page.title?.length || 0),
        csvEscape(page.metaDescription || ''),
        csvEscape(page.metaDescription?.length || 0),
        csvEscape(page.canonical || ''),
        csvEscape(page.robotsMeta || ''),
        csvEscape(page.htmlLang || ''),
        csvEscape(page.viewport || ''),
        csvEscape(page.mobileOptimized ? 'Yes' : 'No'),
        csvEscape(page.contentMetrics?.wordCount || 0),
        csvEscape(formatPercentage(page.contentMetrics?.readabilityScore)),
        csvEscape(formatPercentage(page.contentMetrics?.contentDepth)),
        csvEscape((page.headings || []).length),
        csvEscape((page.images || []).length),
        csvEscape((page.internalLinks || []).length),
        csvEscape((page.externalLinks || []).length),
        csvEscape((page.issues || []).length),
        csvEscape(criticalIssues),
        csvEscape(warningIssues),
        csvEscape(infoIssues),
        csvEscape((page.suggestions || []).length),
        csvEscape(topKeywords),
        csvEscape(semanticKeywords),
        csvEscape((page.openGraph as any)?.title || ''),
        csvEscape((page.openGraph as any)?.description || ''),
        csvEscape((page.openGraph as any)?.image || ''),
        csvEscape((page.openGraph as any)?.type || ''),
        csvEscape((page.twitterCard as any)?.card || ''),
        csvEscape((page.twitterCard as any)?.title || ''),
        csvEscape((page.twitterCard as any)?.description || ''),
        csvEscape((page.twitterCard as any)?.image || ''),
        csvEscape(joinArray(page.suggestions || [])),
        csvEscape(issueDetails),
        csvEscape(imageAnalysis)
      ];

      csv += row.join(',') + '\n';
    });

    // === ISSUES SUMMARY SECTION ===
    csv += '\n=== ISSUES SUMMARY ===\n';
    csv += "Page URL,Issue Title,Severity,Description,Recommendation\n";
    
    (analysis.pages as any[])?.forEach((page: any) => {
      (page.issues || []).forEach((issue: any) => {
        csv += [
          csvEscape(page.url),
          csvEscape(issue.title || ''),
          csvEscape(issue.severity || ''),
          csvEscape(issue.description || ''),
          csvEscape(issue.recommendation || '')
        ].join(',') + '\n';
      });
    });

    // === IMAGE ANALYSIS SECTION ===
    csv += '\n=== IMAGE ANALYSIS ===\n';
    csv += "Page URL,Image Source,Alt Text,AI Suggested Alt,Has Alt Text,Optimization Status\n";
    
    (analysis.pages as any[])?.forEach((page: any) => {
      (page.images || []).forEach((image: any) => {
        csv += [
          csvEscape(page.url),
          csvEscape(image.src || ''),
          csvEscape(image.alt || ''),
          csvEscape(image.suggestedAlt || ''),
          csvEscape(image.alt ? 'Yes' : 'No'),
          csvEscape(image.alt ? 'Optimized' : 'Needs Alt Text')
        ].join(',') + '\n';
      });
    });

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=comprehensive-analysis-${id}.csv`);
    res.send(csv);

  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: "Failed to export analysis as CSV" });
  }
}