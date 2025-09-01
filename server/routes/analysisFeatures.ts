import type { Express } from "express";
import { storage } from "../storage";
import { analyzeSite } from "../seoAnalyzer";
import { generateSeoSuggestions, analyzeContentRepetition, generateCompetitorInsights } from "../openai";
import { isAuthenticated } from "../replitAuth";
import { analysisEvents, apiLimiter } from "./index";

// Helper function for basic competitor recommendations (fallback when AI isn't available)
function generateBasicCompetitorRecommendations(metrics: any): string[] {
  const recommendations: string[] = [];
  
  if (metrics.titleOptimization.difference < 0) {
    recommendations.push("Your competitor has better optimized page titles. Consider reviewing and improving your title tags.");
  }

  if (metrics.descriptionOptimization.difference < 0) {
    recommendations.push("Your competitor has better optimized meta descriptions. Focus on writing more compelling and keyword-rich descriptions.");
  }

  if (metrics.headingsOptimization.difference < 0) {
    recommendations.push("Your competitor has better heading structure. Ensure you use a logical heading hierarchy with relevant keywords.");
  }

  if (metrics.imagesOptimization.difference < 0) {
    recommendations.push("Your competitor has better optimized images. Make sure all your images have descriptive alt text.");
  }

  if (metrics.criticalIssues.difference < 0) {
    recommendations.push("You have more critical issues than your competitor. Prioritize fixing these issues to improve your SEO performance.");
  }

  // Add generic recommendations if no specific issues found
  if (recommendations.length === 0) {
    recommendations.push("Your site performs comparably to the competitor. Focus on content quality and user experience improvements.");
  }

  return recommendations;
}

export function registerAnalysisFeaturesRoutes(app: Express) {
  // Export analysis as PDF
  app.get("/api/analysis/:id/export/pdf", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }

      const analysis = await storage.getAnalysisById(id);

      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      // Generate PDF content
      // This would normally use a library like PDFKit, but for simplicity we're using HTML to PDF approach

      // Create simple HTML template for the PDF
      const pdfHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>SEO Analysis Report - ${analysis.domain}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            h1 { color: #333; }
            h2 { color: #444; margin-top: 30px; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .issue { margin-bottom: 10px; padding: 10px; background-color: #f9f9f9; }
            .critical { border-left: 4px solid #e74c3c; }
            .warning { border-left: 4px solid #f39c12; }
            .metrics { display: flex; margin-bottom: 20px; }
            .metric-box { padding: 15px; margin-right: 15px; border-radius: 4px; }
            .good { background-color: #e6ffe6; }
            .warning-box { background-color: #fff8e6; }
            .critical-box { background-color: #ffe6e6; }
          </style>
        </head>
        <body>
          <h1>SEO Analysis Report</h1>
          <p>
            <strong>Domain:</strong> ${analysis.domain}<br>
            <strong>Analysis Date:</strong> ${new Date(analysis.date).toLocaleDateString()}<br>
            <strong>Pages Analyzed:</strong> ${analysis.pagesCount}
          </p>

          <h2>Overall Metrics</h2>
          <div class="metrics">
            <div class="metric-box good">
              <h3>Good Practices</h3>
              <p>${analysis.metrics.goodPractices}</p>
            </div>
            <div class="metric-box warning-box">
              <h3>Warnings</h3>
              <p>${analysis.metrics.warnings}</p>
            </div>
            <div class="metric-box critical-box">
              <h3>Critical Issues</h3>
              <p>${analysis.metrics.criticalIssues}</p>
            </div>
          </div>

          <h2>Page Analysis</h2>
          ${analysis.pages.map(page => `
            <div class="page-analysis">
              <h3>${page.pageName} - ${page.url}</h3>
              <p><strong>Title:</strong> ${page.title || 'None'}</p>
              <p><strong>Meta Description:</strong> ${page.metaDescription || 'None'}</p>

              ${page.issues.length > 0 ? `
                <h4>Issues (${page.issues.length})</h4>
                ${page.issues.map(issue => `
                  <div class="issue ${issue.severity}">
                    <strong>${issue.title}</strong>: ${issue.description}
                  </div>
                `).join('')}
              ` : '<p>No issues found</p>'}

              ${page.suggestions.length > 0 ? `
                <h4>Suggestions</h4>
                <ul>
                  ${page.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `).join('')}
        </body>
        </html>
      `;

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename=analysis-${id}.html`);
      res.send(pdfHtml);

    } catch (error) {
      res.status(500).json({ error: "Failed to export analysis as PDF" });
    }
  });

  // Export analysis as CSV
  app.get("/api/analysis/:id/export/csv", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }

      const analysis = await storage.getAnalysisById(id);

      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      // Generate CSV content
      let csv = "URL,Title,Title Length,Meta Description,Description Length,Headings,Issues,Suggestions\n";

      analysis.pages.forEach(page => {
        const row = [
          `"${page.url}"`,
          `"${page.title || ''}"`,
          page.title?.length || 0,
          `"${page.metaDescription || ''}"`,
          page.metaDescription?.length || 0,
          `"${page.headings.map(h => `${h.level}: ${h.text}`).join('; ')}"`,
          page.issues.length,
          `"${page.suggestions.join('; ')}"`
        ];

        csv += row.join(',') + '\n';
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=analysis-${id}.csv`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ error: "Failed to export analysis as CSV" });
    }
  });

  // Export analysis as JSON
  app.get("/api/analysis/:id/export/json", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }

      const analysis = await storage.getAnalysisById(id);

      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=analysis-${id}.json`);
      res.json(analysis);
    } catch (error) {
      res.status(500).json({ error: "Failed to export analysis as JSON" });
    }
  });

  // Compare with competitor
  app.post("/api/analyze/compare", apiLimiter, async (req, res) => {
    try {
      const { mainDomain, competitorDomain } = req.body;
      if (!mainDomain || !competitorDomain) {
        return res.status(400).json({ error: "Both domains are required" });
      }

      // Get the most recent analysis for the main domain
      const mainAnalysis = await storage.getLatestAnalysisByDomain(mainDomain);
      if (!mainAnalysis) {
        return res.status(404).json({ error: "No analysis found for main domain" });
      }

      try {
        // Check if user is authenticated and get their usage
        let userId: string | undefined;
        if (req.isAuthenticated && req.isAuthenticated()) {
          userId = (req.user as any).claims.sub;
          const usage = await storage.getUserUsage(userId);
          if (usage && usage.pageLimit !== -1 && usage.pagesAnalyzed >= usage.pageLimit) {
            return res.status(403).json({ 
              error: "Page analysis limit reached", 
              message: `You have reached your limit of ${usage.pageLimit} pages. You have analyzed ${usage.pagesAnalyzed} pages.`,
              usage: usage
            });
          }
          
          // Also check if user has any pages remaining (only if not unlimited)
          const remainingPages = usage && usage.pageLimit !== -1 ? usage.pageLimit - usage.pagesAnalyzed : Infinity;
          if (usage && usage.pageLimit !== -1 && remainingPages <= 0) {
            return res.status(403).json({ 
              error: "No pages remaining", 
              message: `You have no pages remaining in your current limit of ${usage?.pageLimit || 0} pages.`,
              usage: usage
            });
          }
        }

        // Analyze the competitor domain
        // For simplicity, we'll reuse the existing analysis flow but mark as competitor to skip alt text generation
        const competitorAnalysisId = await analyzeSite(competitorDomain, true, analysisEvents, true, userId, undefined, true);

        // Get the competitor analysis results
        const competitorAnalysis = await storage.getAnalysisById(competitorAnalysisId);
        if (!competitorAnalysis) {
          return res.status(404).json({ error: "Competitor analysis failed" });
        }

        // Compare the analyses
        const comparison = {
          mainDomain,
          competitorDomain,
          metrics: {
            titleOptimization: {
              main: mainAnalysis.metrics.titleOptimization,
              competitor: competitorAnalysis.metrics.titleOptimization,
              difference: mainAnalysis.metrics.titleOptimization - competitorAnalysis.metrics.titleOptimization
            },
            descriptionOptimization: {
              main: mainAnalysis.metrics.descriptionOptimization,
              competitor: competitorAnalysis.metrics.descriptionOptimization,
              difference: mainAnalysis.metrics.descriptionOptimization - competitorAnalysis.metrics.descriptionOptimization
            },
            headingsOptimization: {
              main: mainAnalysis.metrics.headingsOptimization,
              competitor: competitorAnalysis.metrics.headingsOptimization,
              difference: mainAnalysis.metrics.headingsOptimization - competitorAnalysis.metrics.headingsOptimization
            },
            imagesOptimization: {
              main: mainAnalysis.metrics.imagesOptimization,
              competitor: competitorAnalysis.metrics.imagesOptimization,
              difference: mainAnalysis.metrics.imagesOptimization - competitorAnalysis.metrics.imagesOptimization
            },
            criticalIssues: {
              main: mainAnalysis.metrics.criticalIssues,
              competitor: competitorAnalysis.metrics.criticalIssues,
              difference: competitorAnalysis.metrics.criticalIssues - mainAnalysis.metrics.criticalIssues
            }
          },
          // Include optimized analysis data to reduce payload size
        analysis: {
          ...competitorAnalysis,
          // Remove large data that's not needed for comparison
          pages: competitorAnalysis.pages.map(page => ({
            ...page,
            paragraphs: page.paragraphs ? page.paragraphs.slice(0, 2) : [], // Limit paragraphs
            suggestions: page.suggestions ? page.suggestions.slice(0, 3) : [] // Limit suggestions
          }))
        },
          recommendations: []
        };

        // Generate AI-powered strategic recommendations based on competitive analysis
        try {
          // Check if user has credits for AI competitor insights (costs 2 credits)
          const aiInsightsCost = 2;
          let aiInsights: string[] = [];
          
          if (userId) {
            const userUsage = await storage.getUserUsage(userId);
            const isTrialUser = userUsage?.accountStatus === "trial";
            
            if (isTrialUser) {
              // Trial users get basic rule-based recommendations
              aiInsights = generateBasicCompetitorRecommendations(comparison.metrics);
              console.log(`Trial user ${userId}: using basic competitor recommendations`);
            } else {
              // Paid users get AI-powered insights if they have credits
              const creditResult = await storage.atomicDeductCredits(userId, aiInsightsCost);
              if (creditResult.success) {
                aiInsights = await generateCompetitorInsights(mainAnalysis, competitorAnalysis);
                console.log(`Generated ${aiInsights.length} AI-powered competitor insights for user ${userId} (${aiInsightsCost} credits used)`);
              } else {
                // Fallback to basic recommendations if insufficient credits
                aiInsights = generateBasicCompetitorRecommendations(comparison.metrics);
                console.log(`Insufficient credits for AI competitor insights, using basic recommendations for user ${userId}`);
              }
            }
          } else {
            // Unauthenticated users get basic recommendations
            aiInsights = generateBasicCompetitorRecommendations(comparison.metrics);
          }
          
          comparison.recommendations = aiInsights;
        } catch (aiError) {
          console.error("Error generating AI competitor insights:", aiError);
          // Fallback to basic recommendations on AI error
          comparison.recommendations = generateBasicCompetitorRecommendations(comparison.metrics);
        }

        res.json(comparison);
      } catch (error) {
        console.error("Error analyzing competitor domain:", error);
        res.status(500).json({ error: "Failed to analyze competitor domain" });
      }
    } catch (error) {
      console.error("Error in competitor comparison:", error);
      res.status(500).json({ error: "Failed to compare with competitor" });
    }
  });

  // Save competitor analysis to an existing analysis
  app.post("/api/analysis/:id/save-competitor", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analysisId = parseInt(req.params.id);
      const competitorData = req.body;

      if (!competitorData) {
        return res.status(400).json({ error: "Competitor analysis data is required" });
      }

      // Check if the analysis exists and belongs to the user
      const analysis = await storage.getAnalysisById(analysisId);

      if (!analysis) {
        console.log(`Analysis with ID ${analysisId} not found for saving competitor data`);
        return res.status(404).json({ error: "Analysis not found" });
      }

      if (analysis.userId && analysis.userId !== userId) {
        console.log(`User ${userId} attempted to update analysis ${analysisId} belonging to user ${analysis.userId}`);
        return res.status(403).json({ error: "You don't have permission to update this analysis" });
      }

      console.log(`Saving competitor analysis for ID ${analysisId}, user ${userId}, data size: ${JSON.stringify(competitorData).length} bytes`);

      const updatedAnalysis = await storage.updateCompetitorAnalysis(analysisId, competitorData);

      if (!updatedAnalysis) {
        return res.status(500).json({ error: "Failed to update analysis with competitor data" });
      }

      res.json(updatedAnalysis);
    } catch (error) {
      console.error("Error saving competitor analysis:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ 
        error: "Failed to save competitor analysis",
        message: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      });
    }
  });

  // Run content duplication analysis for an existing analysis
  app.post("/api/analysis/:id/content-duplication", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }

      const analysis = await storage.getAnalysisById(id);

      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      // Check if the analysis belongs to the authenticated user
      if (analysis.userId && analysis.userId !== userId) {
        return res.status(403).json({ error: "You don't have permission to access this analysis" });
      }

      // Check if analysis has enough pages for content duplication
      if (analysis.pages.length < 2) {
        return res.status(400).json({ error: "Content duplication analysis requires at least 2 pages" });
      }

      try {
        console.log(`Running content duplication analysis for analysis ${id}...`);
        const contentRepetitionAnalysis = await analyzeContentRepetition(analysis.pages);
        
        // Update the analysis with the content repetition results
        const updatedAnalysis = await storage.updateContentRepetitionAnalysis(id, contentRepetitionAnalysis);
        
        if (!updatedAnalysis) {
          return res.status(500).json({ error: "Failed to save content duplication analysis" });
        }

        // Note: No usage increment needed - this analyzes existing data, doesn't count as new page analysis

        res.json({ contentRepetitionAnalysis });
      } catch (error) {
        console.error(`Error analyzing content repetition for analysis ${id}:`, error);
        res.status(500).json({ error: "Failed to analyze content duplication" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to run content duplication analysis" });
    }
  });

  // Reanalyze a single page from an existing analysis
  app.post("/api/analysis/:id/reanalyze-page", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const analysisId = parseInt(req.params.id);
      const { pageUrl } = req.body;

      if (isNaN(analysisId)) {
        return res.status(400).json({ error: "Invalid analysis ID" });
      }

      if (!pageUrl) {
        return res.status(400).json({ error: "Page URL is required" });
      }

      // Get the existing analysis
      const analysis = await storage.getAnalysisById(analysisId);
      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      // Check if the analysis belongs to the authenticated user
      if (analysis.userId && analysis.userId !== userId) {
        return res.status(403).json({ error: "You don't have permission to modify this analysis" });
      }

      // Check user's usage limits before reanalysis
      const usage = await storage.getUserUsage(userId);
      if (usage && usage.pagesAnalyzed >= usage.pageLimit) {
        return res.status(403).json({ 
          error: "Page analysis limit reached", 
          message: `You have reached your limit of ${usage.pageLimit} pages. You have analyzed ${usage.pagesAnalyzed} pages.`,
          usage: usage
        });
      }

      // Get user settings
      const settings = await storage.getSettings(userId);

      // Import the analyzePage function from seoAnalyzer
      const { analyzePage } = await import('../seoAnalyzer');
      
      // Create abort controller for this specific reanalysis
      const controller = new AbortController();

      // Reanalyze the specific page with saved business context
      const updatedPageAnalysis = await analyzePage(pageUrl, settings, controller.signal, false, analysis.pages, undefined, analysis.siteOverview);

      if (!updatedPageAnalysis) {
        return res.status(500).json({ error: "Failed to reanalyze page" });
      }

      // Update the analysis with the new page data
      const updatedAnalysis = await storage.updatePageInAnalysis(analysisId, pageUrl, updatedPageAnalysis);

      if (!updatedAnalysis) {
        return res.status(500).json({ error: "Failed to update analysis with new page data" });
      }

      // Increment user's page usage count for reanalysis
      await storage.incrementUserUsage(userId, 1);

      res.json({
        message: "Page reanalyzed successfully",
        updatedPage: updatedPageAnalysis,
        analysis: updatedAnalysis
      });

    } catch (error) {
      console.error("Error reanalyzing page:", error);
      res.status(500).json({ 
        error: "Failed to reanalyze page",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
}