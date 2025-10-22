import { Request, Response } from "express";
import { storage } from "../storage.js";

// Helper function to safely render arrays and objects
const safeRender = (value: any) => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "None";
  }
  return value || "None";
};

const formatScore = (score: any) => {
  // Accept numbers in 0-1 range (fraction) or 0-100 range
  if (score === null || score === undefined) return "N/A";
  if (typeof score !== "number") {
    const parsed = Number(score);
    if (isNaN(parsed)) return "N/A";
    score = parsed;
  }

  // If score looks like a fraction (0-1), convert to percent
  if (score >= 0 && score <= 1) {
    score = score * 100;
  }

  return `${Math.round(score)}%`;
};

export async function exportAnalysisPDF(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid analysis ID" });
    }

    const analysis = (await storage.getAnalysisById(id)) as any;

    if (!analysis) {
      return res.status(404).json({ error: "Analysis not found" });
    }

    // Create comprehensive HTML template for the PDF
    const pdfHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Comprehensive SEO Analysis Report - ${analysis.domain}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 30px; line-height: 1.6; color: #333; }
          .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #2c5aa0; padding-bottom: 20px; }
          h1 { color: #2c5aa0; margin-bottom: 10px; font-size: 28px; }
          h2 { color: #34495e; margin-top: 40px; margin-bottom: 20px; font-size: 22px; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
          h3 { color: #34495e; margin-top: 30px; margin-bottom: 15px; font-size: 18px; }
          h4 { color: #34495e; margin-top: 20px; margin-bottom: 10px; font-size: 16px; }
          .summary-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
          .metric-card { padding: 20px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .metric-excellent { background: linear-gradient(135deg, #e8f5e8, #d4edda); border-left: 4px solid #28a745; }
          .metric-good { background: linear-gradient(135deg, #e1f5fe, #b3e5fc); border-left: 4px solid #17a2b8; }
          .metric-warning { background: linear-gradient(135deg, #fff8e1, #ffecb3); border-left: 4px solid #ffc107; }
          .metric-critical { background: linear-gradient(135deg, #ffebee, #ffcdd2); border-left: 4px solid #dc3545; }
          .metric-value { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          .metric-label { font-size: 14px; color: #666; }
          .issue-container { margin: 15px 0; padding: 15px; border-radius: 6px; }
          .issue-critical { background: #fff5f5; border-left: 4px solid #e53e3e; }
          .issue-warning { background: #fffbf0; border-left: 4px solid #dd6b20; }
          .issue-info { background: #f0f9ff; border-left: 4px solid #3182ce; }
          .issue-title { font-weight: bold; margin-bottom: 8px; }
          .issue-description { margin-bottom: 10px; }
          .issue-recommendation { background: rgba(255,255,255,0.8); padding: 10px; border-radius: 4px; font-style: italic; }
          .page-section { background: #fafafa; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #e1e5e9; }
          .page-header { background: #2c5aa0; color: white; padding: 15px; margin: -20px -20px 20px -20px; border-radius: 8px 8px 0 0; }
          .meta-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 15px 0; }
          .meta-card { background: white; padding: 15px; border-radius: 6px; border: 1px solid #dee2e6; }
          .suggestions-list { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .suggestions-list ul { margin: 0; padding-left: 20px; }
          .suggestions-list li { margin-bottom: 8px; }
          .content-analysis { background: #f0f8ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .competitor-section { background: #f5f7fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .insights-section { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .score-bar { background: #e9ecef; height: 20px; border-radius: 10px; overflow: hidden; margin: 5px 0; }
          .score-fill { height: 100%; background: linear-gradient(90deg, #28a745, #ffc107, #dc3545); border-radius: 10px; }
          .table-responsive { overflow-x: auto; margin: 15px 0; }
          table { border-collapse: collapse; width: 100%; background: white; border-radius: 6px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          th { background: #495057; color: white; padding: 12px; text-align: left; font-weight: 600; }
          td { padding: 10px 12px; border-bottom: 1px solid #dee2e6; }
          tr:nth-child(even) { background: #f8f9fa; }
          .keyword-density { display: inline-block; background: #e3f2fd; padding: 4px 8px; border-radius: 4px; margin: 2px; font-size: 12px; }
          .technical-details { background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 10px 0; }
          .print-break { page-break-before: always; }
          @media print { body { margin: 20px; } .print-break { page-break-before: always; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔍 Comprehensive SEO Analysis Report</h1>
          <div class="summary-info">
            <strong>Domain:</strong> ${analysis.domain} | 
            <strong>Analysis Date:</strong> ${new Date(analysis.date).toLocaleDateString()} | 
            <strong>Pages Analyzed:</strong> ${analysis.pagesCount}
          </div>
        </div>

        <!-- Executive Summary -->
        <h2>📊 Executive Summary</h2>
        <div class="metrics-grid">
          <div class="metric-card ${(analysis.metrics as any)?.criticalIssues > 10 ? "metric-critical" : (analysis.metrics as any)?.criticalIssues > 5 ? "metric-warning" : "metric-good"}">
            <div class="metric-value">${(analysis.metrics as any)?.criticalIssues || 0}</div>
            <div class="metric-label">Critical Issues</div>
          </div>
          <div class="metric-card ${(analysis.metrics as any)?.warnings > 15 ? "metric-warning" : "metric-good"}">
            <div class="metric-value">${(analysis.metrics as any)?.warnings || 0}</div>
            <div class="metric-label">Warnings</div>
          </div>
          <div class="metric-card metric-excellent">
            <div class="metric-value">${(analysis.metrics as any)?.goodPractices || 0}</div>
            <div class="metric-label">Good Practices</div>
          </div>
          <div class="metric-card ${((analysis.metrics as any)?.averageContentScore ?? (analysis.enhancedInsights as any)?.contentQualityAnalysis?.overallHealth?.combinedScore) >= 80 ? "metric-excellent" : ((analysis.metrics as any)?.averageContentScore ?? (analysis.enhancedInsights as any)?.contentQualityAnalysis?.overallHealth?.combinedScore) >= 60 ? "metric-good" : "metric-warning"}">
            <div class="metric-value">${formatScore((analysis.metrics as any)?.averageContentScore ?? (analysis.enhancedInsights as any)?.contentQualityAnalysis?.overallHealth?.combinedScore ?? null)}</div>
            <div class="metric-label">Content Quality</div>
          </div>
        </div>

        ${(() => {
          // Generate site keyword cloud data
          const siteKeywordCloud =
            (analysis as any).siteKeywordCloud ||
            (() => {
              const map = new Map<string, { count: number; density: number }>();
              (analysis.pages || []).forEach((p: any) => {
                (p.keywordDensity || []).forEach((kw: any) => {
                  const key = kw.keyword.toLowerCase();
                  const ex = map.get(key) || { count: 0, density: 0 };
                  ex.count += kw.count || 0;
                  ex.density += kw.density || 0;
                  map.set(key, ex);
                });
              });
              return Array.from(map.entries())
                .map(([keyword, v]) => ({
                  keyword,
                  count: v.count,
                  avgDensity: v.density,
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 40);
            })();

          return siteKeywordCloud.length > 0
            ? `
            <h2>🔑 Site Keyword Cloud</h2>
            <div class="insights-section">
              <p class="text-sm text-gray-600 mb-4">Top keywords found across your entire website, sized by frequency and density.</p>
              <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                ${siteKeywordCloud
                  .map((kw: any) => {
                    const fontSize = Math.min(
                      36,
                      Math.max(
                        12,
                        12 +
                          (kw.count /
                            Math.max(
                              ...siteKeywordCloud.map((k: any) => k.count),
                            )) *
                            24,
                      ),
                    );
                    return `<span style="font-size: ${fontSize}px; color: #2c5aa0; font-weight: 500; padding: 4px 8px;" title="${kw.keyword}: ${kw.count} occurrences, ${(kw.avgDensity || 0).toFixed(2)}% avg density">${kw.keyword}</span>`;
                  })
                  .join("")}
              </div>
              <div class="table-responsive" style="margin-top: 20px;">
                <table>
                  <thead>
                    <tr>
                      <th>Keyword</th>
                      <th>Occurrences</th>
                      <th>Avg Density</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${siteKeywordCloud
                      .slice(0, 15)
                      .map(
                        (kw: any) => `
                      <tr>
                        <td><strong>${kw.keyword}</strong></td>
                        <td>${kw.count}</td>
                        <td>${(kw.avgDensity || 0).toFixed(2)}%</td>
                      </tr>
                    `,
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            </div>
          `
            : "";
        })()}

        ${
          analysis.siteOverview
            ? `
          <h2>🏢 Site Overview & Business Context</h2>
          <div class="insights-section">
            <h4>Business Type:</h4>
            <p>${(analysis.siteOverview as any)?.businessType || "Not determined"}</p>

            <h4>Target Audience:</h4>
            <p>${(analysis.siteOverview as any)?.targetAudience || "Not determined"}</p>

            <h4>Primary Goals:</h4>
            <p>${(analysis.siteOverview as any)?.primaryGoals || "Not determined"}</p>

            <h4>Content Strategy:</h4>
            <p>${Array.isArray((analysis.siteOverview as any)?.contentStrategy) ? (analysis.siteOverview as any).contentStrategy.join(". ") : (analysis.siteOverview as any)?.contentStrategy || "Not determined"}</p>

            ${
              (analysis.siteOverview as any)?.keyStrengths
                ? `
              <h4>Key Strengths:</h4>
              <ul>
                ${(analysis.siteOverview as any).keyStrengths.map((strength: string) => `<li>${strength}</li>`).join("")}
              </ul>
            `
                : ""
            }

            ${
              (analysis.siteOverview as any)?.improvementAreas
                ? `
              <h4>Areas for Improvement:</h4>
              <ul>
                ${(analysis.siteOverview as any).improvementAreas.map((area: string) => `<li>${area}</li>`).join("")}
              </ul>
            `
                : ""
            }
          </div>
        `
            : ""
        }

        ${(() => {
          // Get content quality analysis from either location
          const contentQuality =
            analysis.contentQualityAnalysis ||
            (analysis.enhancedInsights as any)?.contentQualityAnalysis;

          if (!contentQuality) return "";

          return `
          <div class="print-break"></div>
          <h2>📝 Content Quality Analysis</h2>
          <div class="content-analysis">
            <h3>Overall Content Health</h3>
            <div class="metrics-grid">
              <div class="metric-card ${contentQuality.overallHealth?.contentScore >= 80 ? "metric-excellent" : contentQuality.overallHealth?.contentScore >= 60 ? "metric-good" : "metric-warning"}">
                <div class="metric-value">${formatScore(contentQuality.overallHealth?.contentScore)}</div>
                <div class="metric-label">Content Score</div>
              </div>
              <div class="metric-card ${contentQuality.overallHealth?.keywordScore >= 80 ? "metric-excellent" : contentQuality.overallHealth?.keywordScore >= 60 ? "metric-good" : "metric-warning"}">
                <div class="metric-value">${formatScore(contentQuality.overallHealth?.keywordScore)}</div>
                <div class="metric-label">Keyword Score</div>
              </div>
              <div class="metric-card ${contentQuality.overallHealth?.qualityScore >= 80 ? "metric-excellent" : contentQuality.overallHealth?.qualityScore >= 60 ? "metric-good" : "metric-warning"}">
                <div class="metric-value">${formatScore(contentQuality.overallHealth?.qualityScore)}</div>
                <div class="metric-label">Quality Score</div>
              </div>
              <div class="metric-card ${contentQuality.contentUniqueness?.uniquenessScore >= 80 ? "metric-excellent" : contentQuality.contentUniqueness?.uniquenessScore >= 60 ? "metric-good" : "metric-warning"}">
                <div class="metric-value">${formatScore(contentQuality.contentUniqueness?.uniquenessScore)}</div>
                <div class="metric-label">Uniqueness Score</div>
              </div>
            </div>

            ${
              contentQuality.contentUniqueness?.totalDuplicates > 0
                ? `
              <h4>⚠️ Content Duplication Issues</h4>
              <p><strong>Total Duplicates Found:</strong> ${contentQuality.contentUniqueness.totalDuplicates} across ${contentQuality.contentUniqueness.pagesAnalyzed} pages</p>

              ${
                contentQuality.contentUniqueness.duplicateContent.titles
                  ?.length > 0
                  ? `
                <h5>Duplicate Titles:</h5>
                ${contentQuality.contentUniqueness.duplicateContent.titles
                  .map(
                    (group: any) => `
                  <div class="issue-container issue-warning">
                    <div class="issue-title">"${group.content}"</div>
                    <div class="issue-description">Found on ${group.urls.length} pages (${group.impactLevel} impact)</div>
                    <div class="issue-recommendation">${group.improvementStrategy}</div>
                  </div>
                `,
                  )
                  .join("")}
              `
                  : ""
              }

              ${
                contentQuality.contentUniqueness.duplicateContent.descriptions
                  ?.length > 0
                  ? `
                <h5>Duplicate Meta Descriptions:</h5>
                ${contentQuality.contentUniqueness.duplicateContent.descriptions
                  .map(
                    (group: any) => `
                  <div class="issue-container issue-warning">
                    <div class="issue-title">"${group.content}"</div>
                    <div class="issue-description">Found on ${group.urls.length} pages (${group.impactLevel} impact)</div>
                    <div class="issue-recommendation">${group.improvementStrategy}</div>
                  </div>
                `,
                  )
                  .join("")}
              `
                  : ""
              }
            `
                : "<p>✅ No significant content duplication found.</p>"
            }

            ${
              contentQuality.strategicRecommendations?.length > 0
                ? `
              <h4>🎯 Strategic Recommendations</h4>
              ${contentQuality.strategicRecommendations
                .map(
                  (rec: any) => `
                <div class="issue-container ${rec.priority === "Critical" ? "issue-critical" : rec.priority === "High" ? "issue-warning" : "issue-info"}">
                  <div class="issue-title">${rec.title} (${rec.priority} Priority)</div>
                  <div class="issue-description"><strong>Category:</strong> ${rec.category}</div>
                  <div class="issue-description">${rec.description}</div>
                  <div class="issue-recommendation"><strong>Implementation:</strong> ${rec.implementation}</div>
                  <div class="issue-recommendation"><strong>Expected Impact:</strong> ${rec.expectedImpact}</div>
                </div>
              `,
                )
                .join("")}
            `
                : ""
            }
          </div>
        `;
        })()}

        ${
          analysis.enhancedInsights
            ? `
          <div class="print-break"></div>
          <h2>🚀 Enhanced SEO Insights</h2>
          <div class="insights-section">
            
            ${
              (analysis.enhancedInsights as any)?.contentQualityAnalysis
                ? `
              <h3>📝 Content Quality Analysis</h3>
              <div class="technical-details">
                <h4>Overall Content Quality Score: ${formatScore((analysis.enhancedInsights as any).contentQualityAnalysis.overallHealth?.combinedScore || (analysis.enhancedInsights as any).contentQualityAnalysis.overallScore || 0)}</h4>
                <p><strong>Explanation:</strong> ${(analysis.enhancedInsights as any).contentQualityAnalysis.explanation || "Comprehensive analysis of content uniqueness, keyword optimization, and overall quality."}</p>

                ${
                  (analysis.enhancedInsights as any).contentQualityAnalysis
                    .overallHealth
                    ? `
                  <h4>Content Health Breakdown:</h4>
                  <div class="metrics-grid">
                    <div class="metric-card ${(analysis.enhancedInsights as any).contentQualityAnalysis.overallHealth.contentScore >= 80 ? "metric-excellent" : (analysis.enhancedInsights as any).contentQualityAnalysis.overallHealth.contentScore >= 60 ? "metric-good" : "metric-warning"}">
                      <div class="metric-value">${formatScore((analysis.enhancedInsights as any).contentQualityAnalysis.overallHealth.contentScore)}</div>
                      <div class="metric-label">Content Score</div>
                    </div>
                    <div class="metric-card ${(analysis.enhancedInsights as any).contentQualityAnalysis.overallHealth.keywordScore >= 80 ? "metric-excellent" : (analysis.enhancedInsights as any).contentQualityAnalysis.overallHealth.keywordScore >= 60 ? "metric-good" : "metric-warning"}">
                      <div class="metric-value">${formatScore((analysis.enhancedInsights as any).contentQualityAnalysis.overallHealth.keywordScore)}</div>
                      <div class="metric-label">Keyword Score</div>
                    </div>
                    <div class="metric-card ${(analysis.enhancedInsights as any).contentQualityAnalysis.overallHealth.qualityScore >= 80 ? "metric-excellent" : (analysis.enhancedInsights as any).contentQualityAnalysis.overallHealth.qualityScore >= 60 ? "metric-good" : "metric-warning"}">
                      <div class="metric-value">${formatScore((analysis.enhancedInsights as any).contentQualityAnalysis.overallHealth.qualityScore)}</div>
                      <div class="metric-label">Quality Score</div>
                    </div>
                  </div>
                `
                    : ""
                }

                ${
                  (analysis.enhancedInsights as any).contentQualityAnalysis
                    .contentUniqueness
                    ? `
                  <h4>Content Uniqueness:</h4>
                  <p><strong>Uniqueness Score:</strong> ${formatScore((analysis.enhancedInsights as any).contentQualityAnalysis.contentUniqueness.uniquenessScore)}</p>
                  <p><strong>Total Duplicates:</strong> ${(analysis.enhancedInsights as any).contentQualityAnalysis.contentUniqueness.totalDuplicates}</p>
                  <p><strong>Pages Analyzed:</strong> ${(analysis.enhancedInsights as any).contentQualityAnalysis.contentUniqueness.pagesAnalyzed}</p>
                `
                    : ""
                }

                ${
                  (analysis.enhancedInsights as any).contentQualityAnalysis
                    .keywordQuality
                    ? `
                  <h4>Keyword Quality:</h4>
                  <p><strong>Health Score:</strong> ${formatScore((analysis.enhancedInsights as any).contentQualityAnalysis.keywordQuality.healthScore)}</p>
                  <p><strong>Readability Impact:</strong> ${(analysis.enhancedInsights as any).contentQualityAnalysis.keywordQuality.readabilityImpact}</p>
                  ${
                    (analysis.enhancedInsights as any).contentQualityAnalysis
                      .keywordQuality.overOptimization?.length > 0
                      ? `
                    <p><strong>Over-optimization Issues:</strong> ${(analysis.enhancedInsights as any).contentQualityAnalysis.keywordQuality.overOptimization.length} keywords need attention</p>
                  `
                      : ""
                  }
                  ${
                    (analysis.enhancedInsights as any).contentQualityAnalysis
                      .keywordQuality.underOptimization?.length > 0
                      ? `
                    <p><strong>Optimization Opportunities:</strong> ${(analysis.enhancedInsights as any).contentQualityAnalysis.keywordQuality.underOptimization.length} opportunities identified</p>
                  `
                      : ""
                  }
                `
                    : ""
                }

                ${
                  (analysis.enhancedInsights as any).contentQualityAnalysis
                    .strategicRecommendations?.length > 0
                    ? `
                  <h4>Strategic Recommendations:</h4>
                  <ul>
                    ${(
                      analysis.enhancedInsights as any
                    ).contentQualityAnalysis.strategicRecommendations
                      .slice(0, 5)
                      .map(
                        (rec: any) => `
                      <li><strong>${rec.title}</strong> (${rec.priority} priority)<br>
                      ${rec.description}<br>
                      <em>Impact:</em> ${rec.expectedImpact}</li>
                    `,
                      )
                      .join("")}
                  </ul>
                `
                    : ""
                }
              </div>
            `
                : ""
            }

            ${
              (analysis.enhancedInsights as any)?.performanceAnalysis
                ? `
              <h3>⚡ Performance Analysis</h3>
              <div class="technical-details">
                <h4>Overall Performance Score: ${formatScore((analysis.enhancedInsights as any).performanceAnalysis.overallScore)}</h4>
                <p><strong>Explanation:</strong> ${(analysis.enhancedInsights as any).performanceAnalysis.explanation || "Analysis of website performance including resource optimization, loading patterns, and user experience."}</p>

                ${
                  (analysis.enhancedInsights as any).performanceAnalysis
                    .resourceOptimization
                    ? `
                  <h4>Resource Optimization:</h4>
                  <div class="metrics-grid">
                    <div class="metric-card ${(analysis.enhancedInsights as any).performanceAnalysis.resourceOptimization.optimizationScore >= 80 ? "metric-excellent" : (analysis.enhancedInsights as any).performanceAnalysis.resourceOptimization.optimizationScore >= 60 ? "metric-good" : "metric-warning"}">
                      <div class="metric-value">${formatScore((analysis.enhancedInsights as any).performanceAnalysis.resourceOptimization.optimizationScore)}</div>
                      <div class="metric-label">Optimization Score</div>
                    </div>
                    <div class="metric-card ${(analysis.enhancedInsights as any).performanceAnalysis.resourceOptimization.imageOptimization >= 80 ? "metric-excellent" : (analysis.enhancedInsights as any).performanceAnalysis.resourceOptimization.imageOptimization >= 60 ? "metric-good" : "metric-warning"}">
                      <div class="metric-value">${formatScore((analysis.enhancedInsights as any).performanceAnalysis.resourceOptimization.imageOptimization)}</div>
                      <div class="metric-label">Image Optimization</div>
                    </div>
                    <div class="metric-card metric-good">
                      <div class="metric-value">${(analysis.enhancedInsights as any).performanceAnalysis.resourceOptimization.resourceCount?.total || 0}</div>
                      <div class="metric-label">Total Resources</div>
                    </div>
                    <div class="metric-card metric-good">
                      <div class="metric-value">${Math.round((analysis.enhancedInsights as any).performanceAnalysis.resourceOptimization.estimatedPageSize || 0)}KB</div>
                      <div class="metric-label">Est. Page Size</div>
                    </div>
                  </div>
                `
                    : ""
                }

                ${
                  (analysis.enhancedInsights as any).performanceAnalysis
                    .loadingPatterns
                    ? `
                  <h4>Loading Patterns:</h4>
                  <div class="metrics-grid">
                    <div class="metric-card ${(analysis.enhancedInsights as any).performanceAnalysis.loadingPatterns.loadingScore >= 80 ? "metric-excellent" : (analysis.enhancedInsights as any).performanceAnalysis.loadingPatterns.loadingScore >= 60 ? "metric-good" : "metric-warning"}">
                      <div class="metric-value">${formatScore((analysis.enhancedInsights as any).performanceAnalysis.loadingPatterns.loadingScore)}</div>
                      <div class="metric-label">Loading Score</div>
                    </div>
                    <div class="metric-card metric-good">
                      <div class="metric-value">${formatScore((analysis.enhancedInsights as any).performanceAnalysis.loadingPatterns.criticalResourceLoading)}</div>
                      <div class="metric-label">Critical Resources</div>
                    </div>
                    <div class="metric-card metric-good">
                      <div class="metric-value">${formatScore((analysis.enhancedInsights as any).performanceAnalysis.loadingPatterns.asynchronousLoading)}</div>
                      <div class="metric-label">Async Loading</div>
                    </div>
                  </div>
                `
                    : ""
                }

                ${
                  (analysis.enhancedInsights as any).performanceAnalysis
                    .userExperienceMetrics
                    ? `
                  <h4>User Experience Metrics:</h4>
                  <div class="metrics-grid">
                    <div class="metric-card ${(analysis.enhancedInsights as any).performanceAnalysis.userExperienceMetrics.uxScore >= 80 ? "metric-excellent" : (analysis.enhancedInsights as any).performanceAnalysis.userExperienceMetrics.uxScore >= 60 ? "metric-good" : "metric-warning"}">
                      <div class="metric-value">${formatScore((analysis.enhancedInsights as any).performanceAnalysis.userExperienceMetrics.uxScore)}</div>
                      <div class="metric-label">UX Score</div>
                    </div>
                    <div class="metric-card metric-good">
                      <div class="metric-value">${formatScore((analysis.enhancedInsights as any).performanceAnalysis.userExperienceMetrics.contentAccessibility)}</div>
                      <div class="metric-label">Accessibility</div>
                    </div>
                    <div class="metric-card metric-good">
                      <div class="metric-value">${formatScore((analysis.enhancedInsights as any).performanceAnalysis.userExperienceMetrics.contentReadability)}</div>
                      <div class="metric-label">Readability</div>
                    </div>
                    <div class="metric-card metric-good">
                      <div class="metric-value">${formatScore((analysis.enhancedInsights as any).performanceAnalysis.userExperienceMetrics.mobileExperience)}</div>
                      <div class="metric-label">Mobile Experience</div>
                    </div>
                  </div>
                `
                    : ""
                }

                ${
                  (analysis.enhancedInsights as any).performanceAnalysis
                    .recommendations?.length > 0
                    ? `
                  <h4>Performance Recommendations:</h4>
                  <ul>
                    ${(
                      analysis.enhancedInsights as any
                    ).performanceAnalysis.recommendations
                      .map(
                        (rec: any) => `
                      <li><strong>${rec.title}</strong> (${rec.priority} priority, Impact: ${rec.impact}/10)<br>
                      ${rec.description}<br>
                      <em>Expected Improvement:</em> ${rec.estimatedImprovement}</li>
                    `,
                      )
                      .join("")}
                  </ul>
                `
                    : ""
                }
              </div>
            `
                : ""
            }

            ${
              (analysis.enhancedInsights as any)?.technicalAnalysis
                ? `
              <h3>🔧 Technical SEO Analysis</h3>
              <div class="technical-details">
                <h4>Overall Technical Score: ${formatScore((analysis.enhancedInsights as any).technicalAnalysis.overallScore)}</h4>
                <p><strong>Explanation:</strong> ${(analysis.enhancedInsights as any).technicalAnalysis.explanation}</p>

                ${
                  (analysis.enhancedInsights as any).technicalAnalysis
                    .coreWebVitals
                    ? `
                  <h4>Core Web Vitals:</h4>
                  <div class="metrics-grid">
                    <div class="metric-card metric-good">
                      <div class="metric-value">${formatScore((analysis.enhancedInsights as any).technicalAnalysis.coreWebVitals.score)}</div>
                      <div class="metric-label">Overall Score</div>
                    </div>
                    <div class="metric-card metric-good">
                      <div class="metric-value">${formatScore((analysis.enhancedInsights as any).technicalAnalysis.coreWebVitals.loadingSpeed)}</div>
                      <div class="metric-label">Loading Speed</div>
                    </div>
                    <div class="metric-card metric-good">
                      <div class="metric-value">${formatScore((analysis.enhancedInsights as any).technicalAnalysis.coreWebVitals.interactivity)}</div>
                      <div class="metric-label">Interactivity</div>
                    </div>
                    <div class="metric-card metric-good">
                      <div class="metric-value">${formatScore((analysis.enhancedInsights as any).technicalAnalysis.coreWebVitals.visualStability)}</div>
                      <div class="metric-label">Visual Stability</div>
                    </div>
                  </div>
                `
                    : ""
                }

                ${
                  (analysis.enhancedInsights as any).technicalAnalysis
                    .recommendations?.length > 0
                    ? `
                  <h4>Technical Recommendations:</h4>
                  <ul>
                    ${(
                      analysis.enhancedInsights as any
                    ).technicalAnalysis.recommendations
                      .map(
                        (rec: any) => `
                      <li><strong>${rec.title}</strong> (${rec.priority} priority, Impact: ${rec.impact}/10)<br>
                      ${rec.description}<br>
                      <em>Action: ${rec.actionItems?.join(", ") || "See details"}</em></li>
                    `,
                      )
                      .join("")}
                  </ul>
                `
                    : ""
                }

                ${
                  (analysis.enhancedInsights as any).technicalAnalysis
                    .securityAnalysis
                    ? `
                  <h4>Security Analysis:</h4>
                  <p><strong>Security Score:</strong> ${formatScore((analysis.enhancedInsights as any).technicalAnalysis.securityAnalysis.securityScore)}</p>
                  <p><strong>HTTPS Enabled:</strong> ${(analysis.enhancedInsights as any).technicalAnalysis.securityAnalysis.httpsEnabled ? "✅ Yes" : "❌ No"}</p>
                  <p><strong>Mixed Content:</strong> ${(analysis.enhancedInsights as any).technicalAnalysis.securityAnalysis.mixedContent ? "⚠️ Detected" : "✅ None detected"}</p>
                `
                    : ""
                }

                ${
                  (analysis.enhancedInsights as any).technicalAnalysis
                    .mobileOptimization
                    ? `
                  <h4>Mobile Optimization:</h4>
                  <p><strong>Mobile Score:</strong> ${formatScore((analysis.enhancedInsights as any).technicalAnalysis.mobileOptimization.mobileScore)}</p>
                  <p><strong>Viewport Meta:</strong> ${(analysis.enhancedInsights as any).technicalAnalysis.mobileOptimization.hasViewportMeta ? "✅ Present" : "❌ Missing"}</p>
                  <p><strong>Responsive Design:</strong> ${formatScore((analysis.enhancedInsights as any).technicalAnalysis.mobileOptimization.responsiveDesign)}</p>
                  <p><strong>Touch Optimization:</strong> ${formatScore((analysis.enhancedInsights as any).technicalAnalysis.mobileOptimization.touchOptimization)}</p>
                `
                    : ""
                }
              </div>
            `
                : ""
            }

            

            ${
              (analysis.enhancedInsights as any)?.contentQualityAnalysis
                ? `
              <h3>📊 Enhanced Content Quality Analysis</h3>
              <div class="technical-details">
                <h4>Content Quality Score: ${formatScore((analysis.enhancedInsights as any).contentQualityAnalysis.overallHealth.combinedScore)}</h4>
                <p><strong>Explanation:</strong> ${(analysis.enhancedInsights as any).contentQualityAnalysis.explanation}</p>

                <h4>Content Quality Breakdown:</h4>
                <div class="metrics-grid">
                  <div class="metric-card metric-good">
                    <div class="metric-value">${formatScore((analysis.enhancedInsights as any).contentQualityAnalysis.overallHealth.contentScore)}</div>
                    <div class="metric-label">Content Score</div>
                  </div>
                  <div class="metric-card metric-good">
                    <div class="metric-value">${formatScore((analysis.enhancedInsights as any).contentQualityAnalysis.overallHealth.keywordScore)}</div>
                    <div class="metric-label">Keyword Score</div>
                  </div>
                  <div class="metric-card metric-good">
                    <div class="metric-value">${formatScore((analysis.enhancedInsights as any).contentQualityAnalysis.overallHealth.qualityScore)}</div>
                    <div class="metric-label">Quality Score</div>
                  </div>
                </div>

                ${
                  (analysis.enhancedInsights as any).contentQualityAnalysis
                    .keywordQuality?.overOptimization?.length > 0
                    ? `
                  <h4>Keyword Over-Optimization Issues:</h4>
                  <ul>
                    ${(
                      analysis.enhancedInsights as any
                    ).contentQualityAnalysis.keywordQuality.overOptimization
                      .map(
                        (issue: any) => `
                      <li><strong>${issue.keyword}</strong>: ${issue.density}% density (${issue.impactLevel} impact)<br>
                      <em>Strategy:</em> ${issue.improvementStrategy}<br>
                      <em>Alternatives:</em> ${issue.alternatives.join(", ")}</li>
                    `,
                      )
                      .join("")}
                  </ul>
                `
                    : ""
                }

                ${
                  (analysis.enhancedInsights as any).contentQualityAnalysis
                    .keywordQuality?.underOptimization?.length > 0
                    ? `
                  <h4>Keyword Opportunities:</h4>
                  <ul>
                    ${(
                      analysis.enhancedInsights as any
                    ).contentQualityAnalysis.keywordQuality.underOptimization
                      .map(
                        (opp: any) => `
                      <li><strong>${opp.suggestion}</strong><br>
                      <em>Opportunity:</em> ${opp.opportunity}<br>
                      <em>Expected Benefit:</em> ${opp.expectedBenefit}</li>
                    `,
                      )
                      .join("")}
                  </ul>
                `
                    : ""
                }
              </div>
            `
                : ""
            }

            ${
              (analysis.enhancedInsights as any)?.linkArchitectureAnalysis
                ? `
              <h3>🔗 Link Architecture Analysis</h3>
              <div class="technical-details">
                <h4>Link Architecture Score: ${formatScore((analysis.enhancedInsights as any).linkArchitectureAnalysis.overallScore)}</h4>
                <p><strong>Explanation:</strong> ${(analysis.enhancedInsights as any).linkArchitectureAnalysis.explanation}</p>

                ${
                  (analysis.enhancedInsights as any).linkArchitectureAnalysis
                    .internalLinkingHealth
                    ? `
                  <h4>Internal Linking Health:</h4>
                  <div class="metrics-grid">
                    <div class="metric-card metric-good">
                      <div class="metric-value">${formatScore((analysis.enhancedInsights as any).linkArchitectureAnalysis.internalLinkingHealth.linkDistributionScore)}</div>
                      <div class="metric-label">Link Distribution</div>
                    </div>
                    <div class="metric-card metric-good">
                      <div class="metric-value">${formatScore((analysis.enhancedInsights as any).linkArchitectureAnalysis.internalLinkingHealth.anchorTextQuality)}</div>
                      <div class="metric-label">Anchor Text Quality</div>
                    </div>
                    <div class="metric-card metric-good">
                      <div class="metric-value">${formatScore((analysis.enhancedInsights as any).linkArchitectureAnalysis.internalLinkingHealth.crawlabilityScore)}</div>
                      <div class="metric-label">Crawlability</div>
                    </div>
                  </div>
                `
                    : ""
                }

                ${
                  (analysis.enhancedInsights as any).linkArchitectureAnalysis
                    .recommendations?.length > 0
                    ? `
                  <h4>Link Architecture Recommendations:</h4>
                  <ul>
                    ${(
                      analysis.enhancedInsights as any
                    ).linkArchitectureAnalysis.recommendations
                      .map(
                        (rec: any) => `
                      <li><strong>${rec.title}</strong> (${rec.priority} priority, Impact: ${rec.impact}/10)<br>
                      ${rec.description}<br>
                      <em>Action:</em> ${rec.actionItems?.join(", ") || "See details"}</li>
                    `,
                      )
                      .join("")}
                  </ul>
                `
                    : ""
                }
              </div>
            `
                : ""
            }
          </div>
        `
            : ""
        }

        ${
          analysis.designAnalysis || analysis.enhancedInsights?.designAnalysis
            ? `
          <div class="print-break"></div>
          <h2>🎨 Design Analysis</h2>
          <div class="insights-section">
            ${(() => {
              const designAnalysis =
                analysis.designAnalysis ||
                analysis.enhancedInsights?.designAnalysis;

              if (!designAnalysis)
                return "<p>No design analysis available.</p>";

              return `
                <h3>Overall Design Score: ${formatScore(designAnalysis.overallScore)}</h3>
                <p><strong>Pages Analyzed:</strong> ${designAnalysis.totalPagesAnalyzed || 0}</p>
                ${designAnalysis.summary ? `<p><strong>Summary:</strong> ${designAnalysis.summary}</p>` : ""}

                ${
                  designAnalysis.error
                    ? `
                  <div class="issue-container issue-critical">
                    <div class="issue-title">Design Analysis Error</div>
                    <div class="issue-description">${designAnalysis.error}</div>
                  </div>
                `
                    : ""
                }

                ${
                  designAnalysis.pageAnalyses &&
                  designAnalysis.pageAnalyses.length > 0
                    ? `
                  <h4>Page-by-Page Design Analysis</h4>
                  ${designAnalysis.pageAnalyses
                    .map(
                      (pageAnalysis: any, pageIndex: number) => `
                    <div class="page-section">
                      <div class="page-header">
                        <h4>Page ${pageIndex + 1}: ${pageAnalysis.screenshotData?.url || "Unknown URL"}</h4>
                        <p><strong>Design Score:</strong> ${formatScore(pageAnalysis.overallScore)}</p>
                      </div>

                      ${
                        pageAnalysis.screenshotData?.error
                          ? `
                        <div class="issue-container issue-warning">
                          <div class="issue-title">Screenshot Error</div>
                          <div class="issue-description">${pageAnalysis.screenshotData.error}</div>
                        </div>
                      `
                          : ""
                      }

                      ${
                        pageAnalysis.strengths &&
                        pageAnalysis.strengths.length > 0
                          ? `
                        <h5>✅ Design Strengths</h5>
                        <ul>
                          ${pageAnalysis.strengths
                            .slice(0, 5)
                            .map((strength: any) => `<li>${strength}</li>`)
                            .join("")}
                        </ul>
                      `
                          : ""
                      }

                      ${
                        pageAnalysis.weaknesses &&
                        pageAnalysis.weaknesses.length > 0
                          ? `
                        <h5>⚠️ Areas for Improvement</h5>
                        <ul>
                          ${pageAnalysis.weaknesses
                            .slice(0, 5)
                            .map((weakness: any) => `<li>${weakness}</li>`)
                            .join("")}
                        </ul>
                      `
                          : ""
                      }

                      ${
                        pageAnalysis.recommendations &&
                        pageAnalysis.recommendations.length > 0
                          ? `
                        <h5>🎯 Design Recommendations</h5>
                        ${pageAnalysis.recommendations
                          .map(
                            (rec: any, recIndex: number) => `
                          <div class="issue-container ${rec.severity === "critical" ? "issue-critical" : rec.severity === "high" ? "issue-warning" : "issue-info"}">
                            <div class="issue-title">${rec.title} (${rec.severity} severity)</div>
                            <div class="issue-description"><strong>Category:</strong> ${rec.category.replace("_", " ").toUpperCase()}</div>
                            <div class="issue-description">${rec.description}</div>
                            <div class="issue-recommendation"><strong>Recommendation:</strong> ${rec.recommendation}</div>
                            <div class="issue-recommendation"><strong>Expected Impact:</strong> ${rec.expectedImpact}</div>
                            <div class="issue-recommendation"><strong>Implementation:</strong> ${rec.implementation}</div>
                          </div>
                        `,
                          )
                          .join("")}
                      `
                          : ""
                      }

                      ${
                        pageAnalysis.summary
                          ? `
                        <h5>📝 Page Summary</h5>
                        <div class="technical-details">
                          <p>${pageAnalysis.summary}</p>
                        </div>
                      `
                          : ""
                      }
                    </div>
                  `,
                    )
                    .join("")}
                `
                    : "<p>No individual page design analyses available.</p>"
                }
              `;
            })()}
          </div>
        `
            : ""
        }

        ${
          analysis.competitorAnalysis
            ? `
          <div class="print-break"></div>
          <h2>🥊 Competitor Analysis</h2>
          <div class="competitor-section">
            <h3>Performance Comparison: ${analysis.domain} vs ${(analysis.competitorAnalysis as any)?.competitorDomain || "Competitor"}</h3>
            ${
              (analysis.competitorAnalysis as any)?.metrics
                ? `
              <div class="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Metric</th>
                      <th>Your Site</th>
                      <th>Competitor</th>
                      <th>Difference</th>
                      <th>Advantage</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${Object.entries(
                      (analysis.competitorAnalysis as any).metrics,
                    )
                      .map(
                        ([key, value]: [string, any]) => `
                      <tr>
                        <td>${key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase())}</td>
                        <td>${value.main || "N/A"}</td>
                        <td>${value.competitor || "N/A"}</td>
                        <td style="color: ${value.difference > 0 ? "#28a745" : value.difference < 0 ? "#dc3545" : "#6c757d"}">
                          ${value.difference > 0 ? "+" : ""}${value.difference || 0}
                        </td>
                        <td>${value.advantage === "main" ? "✅ You" : value.advantage === "competitor" ? "❌ Competitor" : "➖ Tied"}</td>
                      </tr>
                    `,
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            `
                : "<p>No detailed comparison data available.</p>"
            }

            ${
              (analysis.competitorAnalysis as any)?.recommendations?.length > 0
                ? `
              <h4>Competitive Recommendations:</h4>
              <ul>
                ${(analysis.competitorAnalysis as any).recommendations.map((rec: string) => `<li>${rec}</li>`).join("")}
              </ul>
            `
                : ""
            }

            ${
              (analysis.competitorAnalysis as any)?.summary
                ? `
              <h4>Competitive Summary:</h4>
              <div class="technical-details">
                <p>${(analysis.competitorAnalysis as any).summary}</p>
              </div>
            `
                : ""
            }
          </div>
        `
            : ""
        }

        <div class="print-break"></div>
        <h2>📄 Detailed Page Analysis</h2>
        ${(analysis.pages as any[])
          ?.map(
            (page: any, index: number) => `
          <div class="page-section">
            <div class="page-header">
              <h3>Page ${index + 1}: ${page.pageName || "Unknown Page"}</h3>
              <p>🔗 ${page.url}</p>
            </div>

            <div class="meta-info">
              <div class="meta-card">
                <h4>📋 Basic Information</h4>
                <p><strong>Title:</strong> ${page.title || "Missing"} ${page.title ? `(${page.title.length} chars)` : ""}</p>
                <p><strong>Meta Description:</strong> ${page.metaDescription || "Missing"} ${page.metaDescription ? `(${page.metaDescription.length} chars)` : ""}</p>
                <p><strong>Canonical URL:</strong> ${page.canonical || "Not set"}</p>
                <p><strong>Robots Meta:</strong> ${page.robotsMeta || "Not set"}</p>
                <p><strong>HTML Lang:</strong> ${page.htmlLang || "Not set"}</p>
                <p><strong>Viewport:</strong> ${page.viewport || "Not set"}</p>
                <p><strong>Mobile Optimized:</strong> ${page.mobileOptimized ? "✅ Yes" : "❌ No"}</p>
              </div>

              <div class="meta-card">
                <h4>📊 Content Metrics</h4>
                ${
                  page.contentMetrics
                    ? `
                  <p><strong>Word Count:</strong> ${page.contentMetrics.wordCount || page.wordCount || 0}</p>
                  <p><strong>Readability Score:</strong> ${formatScore(page.contentMetrics.readabilityScore ?? page.readabilityScore ?? null)}</p>
                  <p><strong>Content Depth:</strong> ${formatScore(page.contentMetrics.contentDepth || page.contentDepthScore)}</p>
                  <p><strong>Headings:</strong> ${(page.headings || []).length} total</p>
                  <p><strong>Images:</strong> ${(page.images || []).length} total</p>
                  <p><strong>Internal Links:</strong> ${(page.internalLinks || []).length}</p>
                  <p><strong>External Links:</strong> ${(page.externalLinks || []).length}</p>
                `
                    : `
                  <p><strong>Word Count:</strong> ${page.wordCount || 0}</p>
                  <p><strong>Readability Score:</strong> ${formatScore(page.readabilityScore ?? null)}</p>
                  <p><strong>Headings:</strong> ${(page.headings || []).length} total</p>
                  <p><strong>Images:</strong> ${(page.images || []).length} total</p>
                  <p><strong>Internal Links:</strong> ${(page.internalLinks || []).length}</p>
                `
                }
              </div>
            </div>

            ${
              page.keywordDensity && page.keywordDensity.length > 0
                ? `
              <h4>🔍 Top Keywords</h4>
              <div style="margin: 10px 0;">
                ${page.keywordDensity
                  .slice(0, 10)
                  .map(
                    (kw: any) => `
                  <span class="keyword-density">${kw.keyword}: ${kw.count} (${(kw.density * 100).toFixed(1)}%)</span>
                `,
                  )
                  .join("")}
              </div>
            `
                : ""
            }

            ${
              page.semanticKeywords && page.semanticKeywords.length > 0
                ? `
              <h4>🎯 Semantic Keywords</h4>
              <p>${page.semanticKeywords.slice(0, 10).join(", ")}</p>
            `
                : ""
            }

            ${
              page.issues && page.issues.length > 0
                ? `
              <h4>⚠️ SEO Issues (${page.issues.length})</h4>
              ${page.issues
                .map(
                  (issue: any) => `
                <div class="issue-container issue-${issue.severity}">
                  <div class="issue-title">${issue.title}</div>
                  <div class="issue-description">${issue.description}</div>
                  ${issue.recommendation ? `<div class="issue-recommendation">💡 ${issue.recommendation}</div>` : ""}
                </div>
              `,
                )
                .join("")}
            `
                : "<p>✅ No SEO issues found on this page.</p>"
            }

            ${
              page.suggestions && page.suggestions.length > 0
                ? `
              <div class="suggestions-list">
                <h4>💡 AI-Powered Suggestions</h4>
                <ul>
                  ${page.suggestions.map((suggestion: string) => `<li>${suggestion}</li>`).join("")}
                </ul>
              </div>
            `
                : ""
            }

            ${
              page.images && page.images.length > 0
                ? `
              <h4>🖼️ Image Analysis</h4>
              <div class="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Image Source</th>
                      <th>Alt Text</th>
                      <th>AI Suggested Alt</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${page.images
                      .map(
                        (img: any) => `
                      <tr>
                        <td>${img.src.length > 50 ? img.src.substring(0, 50) + "..." : img.src}</td>
                        <td>${img.alt || "Missing"}</td>
                        <td>${img.suggestedAlt || "N/A"}</td>
                        <td>${img.alt ? "✅" : "❌"}</td>
                      </tr>
                    `,
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            `
                : ""
            }

            ${
              page.openGraph
                ? `
              <h4>📱 Open Graph Data</h4>
              <div class="technical-details">
                <p><strong>Title:</strong> ${(page.openGraph as any).title || "Not set"}</p>
                <p><strong>Description:</strong> ${(page.openGraph as any).description || "Not set"}</p>
                <p><strong>Image:</strong> ${(page.openGraph as any).image || "Not set"}</p>
                <p><strong>Type:</strong> ${(page.openGraph as any).type || "Not set"}</p>
              </div>
            `
                : ""
            }

            ${
              page.twitterCard
                ? `
              <h4>🐦 Twitter Card Data</h4>
              <div class="technical-details">
                <p><strong>Card:</strong> ${(page.twitterCard as any).card || "Not set"}</p>
                <p><strong>Title:</strong> ${(page.twitterCard as any).title || "Not set"}</p>
                <p><strong>Description:</strong> ${(page.twitterCard as any).description || "Not set"}</p>
                <p><strong>Image:</strong> ${(page.twitterCard as any).image || "Not set"}</p>
              </div>
            `
                : ""
            }
          </div>
        `,
          )
          .join("")}

        <div class="print-break"></div>
        <div style="text-align: center; margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
          <p><strong>Report Generated:</strong> ${new Date().toLocaleString()}</p>
          <p>This comprehensive SEO analysis was generated by your AI-powered SEO analyzer.</p>
          <p>For questions or support, please contact your SEO team.</p>
        </div>
      </body>
      </html>
    `;

    // Set response headers for PDF download
    res.setHeader("Content-Type", "text/html");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=seo-analysis-${analysis.domain}-${id}.html`,
    );
    res.send(pdfHtml);
  } catch (error) {
    console.error("PDF Export Error:", error);
    res.status(500).json({ error: "Failed to export analysis as PDF" });
  }
}
