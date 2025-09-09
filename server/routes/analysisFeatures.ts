import type { Express } from "express";
import { storage } from "../storage";
import { analyzePage } from "../seoAnalyzer";
import { generateSeoSuggestions } from "../analysis-pipeline/ai-suggestions";
// Removed old imports - unified content quality analysis now integrated into main pipeline
import { generateCompetitorInsights } from "../analysis-pipeline/competitor-insights";
import { analyzeCompetitor } from "../competitive-analysis/competitive-analyzer";
import OpenAI from "openai";
import { isAuthenticated } from "../replitAuth";
import { analysisEvents, apiLimiter } from "./index";

// Helper function for basic competitor recommendations (fallback when AI isn't available)
function generateBasicCompetitorRecommendations(metrics: any): string[] {
  const recommendations: string[] = [];

  // Validate metrics to prevent errors
  if (!metrics || typeof metrics !== 'object') {
    return ["Unable to generate competitor recommendations due to missing data."];
  }

  // For all optimization metrics: negative difference means competitor is better
  if (metrics.titleOptimization?.difference < 0) {
    const gap = Math.abs(metrics.titleOptimization.difference).toFixed(1);
    recommendations.push(`Your competitor has better optimized page titles (${gap}% better). Consider reviewing and improving your title tags.`);
  }

  if (metrics.descriptionOptimization?.difference < 0) {
    const gap = Math.abs(metrics.descriptionOptimization.difference).toFixed(1);
    recommendations.push(`Your competitor has better optimized meta descriptions (${gap}% better). Focus on writing more compelling and keyword-rich descriptions.`);
  }

  if (metrics.headingsOptimization?.difference < 0) {
    const gap = Math.abs(metrics.headingsOptimization.difference).toFixed(1);
    recommendations.push(`Your competitor has better heading structure (${gap}% better). Ensure you use a logical heading hierarchy with relevant keywords.`);
  }

  if (metrics.imagesOptimization?.difference < 0) {
    const gap = Math.abs(metrics.imagesOptimization.difference).toFixed(1);
    recommendations.push(`Your competitor has better optimized images (${gap}% better). Make sure all your images have descriptive alt text.`);
  }

  // For critical issues: positive difference means you have MORE issues (worse)
  if (metrics.criticalIssues?.difference > 0) {
    const extraIssues = Math.abs(metrics.criticalIssues.difference);
    recommendations.push(`You have ${extraIssues} more critical issues than your competitor. Prioritize fixing these issues to improve your SEO performance.`);
  }

  // Add positive reinforcement when performing well
  const positiveAreas = [];
  if (metrics.titleOptimization?.difference > 0) positiveAreas.push('title optimization');
  if (metrics.descriptionOptimization?.difference > 0) positiveAreas.push('meta descriptions');
  if (metrics.headingsOptimization?.difference > 0) positiveAreas.push('heading structure');
  if (metrics.imagesOptimization?.difference > 0) positiveAreas.push('image optimization');
  if (metrics.criticalIssues?.difference < 0) positiveAreas.push('critical issues management');

  if (positiveAreas.length > 0) {
    recommendations.push(`You're outperforming your competitor in: ${positiveAreas.join(', ')}. Continue these strong practices.`);
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

      const analysis = await storage.getAnalysisById(id) as any;

      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      // Generate PDF content
      // This would normally use a library like PDFKit, but for simplicity we're using HTML to PDF approach

      // Helper function to safely render arrays and objects
      const safeRender = (value: any) => {
        if (Array.isArray(value)) {
          return value.length > 0 ? value.join(', ') : 'None';
        }
        return value || 'None';
      };

      const formatScore = (score: number) => {
        return typeof score === 'number' ? `${Math.round(score)}%` : 'N/A';
      };

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
            h3 { color: #2c3e50; margin-top: 30px; margin-bottom: 15px; font-size: 18px; }
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
            <div class="metric-card ${(analysis.metrics as any)?.criticalIssues > 10 ? 'metric-critical' : (analysis.metrics as any)?.criticalIssues > 5 ? 'metric-warning' : 'metric-good'}">
              <div class="metric-value">${(analysis.metrics as any)?.criticalIssues || 0}</div>
              <div class="metric-label">Critical Issues</div>
            </div>
            <div class="metric-card ${(analysis.metrics as any)?.warnings > 15 ? 'metric-warning' : 'metric-good'}">
              <div class="metric-value">${(analysis.metrics as any)?.warnings || 0}</div>
              <div class="metric-label">Warnings</div>
            </div>
            <div class="metric-card metric-excellent">
              <div class="metric-value">${(analysis.metrics as any)?.goodPractices || 0}</div>
              <div class="metric-label">Good Practices</div>
            </div>
            <div class="metric-card ${(analysis.metrics as any)?.averageContentScore >= 80 ? 'metric-excellent' : (analysis.metrics as any)?.averageContentScore >= 60 ? 'metric-good' : 'metric-warning'}">
              <div class="metric-value">${formatScore((analysis.metrics as any)?.averageContentScore)}</div>
              <div class="metric-label">Content Quality</div>
            </div>
          </div>

          ${analysis.siteOverview ? `
            <h2>🏢 Site Overview & Business Context</h2>
            <div class="insights-section">
              <h4>Business Type:</h4>
              <p>${(analysis.siteOverview as any)?.businessType || 'Not determined'}</p>
              
              <h4>Target Audience:</h4>
              <p>${(analysis.siteOverview as any)?.targetAudience || 'Not determined'}</p>
              
              <h4>Primary Goals:</h4>
              <p>${(analysis.siteOverview as any)?.primaryGoals || 'Not determined'}</p>
              
              <h4>Content Strategy:</h4>
              <p>${(analysis.siteOverview as any)?.contentStrategy || 'Not determined'}</p>
              
              ${(analysis.siteOverview as any)?.keyStrengths ? `
                <h4>Key Strengths:</h4>
                <ul>
                  ${(analysis.siteOverview as any).keyStrengths.map((strength: string) => `<li>${strength}</li>`).join('')}
                </ul>
              ` : ''}
              
              ${(analysis.siteOverview as any)?.improvementAreas ? `
                <h4>Areas for Improvement:</h4>
                <ul>
                  ${(analysis.siteOverview as any).improvementAreas.map((area: string) => `<li>${area}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          ` : ''}

          ${analysis.contentQualityAnalysis ? `
            <div class="print-break"></div>
            <h2>📝 Content Quality Analysis</h2>
            <div class="content-analysis">
              <h3>Overall Content Health</h3>
              <div class="metrics-grid">
                <div class="metric-card ${(analysis.contentQualityAnalysis as any)?.overallHealth?.contentScore >= 80 ? 'metric-excellent' : (analysis.contentQualityAnalysis as any)?.overallHealth?.contentScore >= 60 ? 'metric-good' : 'metric-warning'}">
                  <div class="metric-value">${formatScore((analysis.contentQualityAnalysis as any)?.overallHealth?.contentScore)}</div>
                  <div class="metric-label">Content Score</div>
                </div>
                <div class="metric-card ${(analysis.contentQualityAnalysis as any)?.overallHealth?.keywordScore >= 80 ? 'metric-excellent' : (analysis.contentQualityAnalysis as any)?.overallHealth?.keywordScore >= 60 ? 'metric-good' : 'metric-warning'}">
                  <div class="metric-value">${formatScore((analysis.contentQualityAnalysis as any)?.overallHealth?.keywordScore)}</div>
                  <div class="metric-label">Keyword Score</div>
                </div>
                <div class="metric-card ${(analysis.contentQualityAnalysis as any)?.overallHealth?.qualityScore >= 80 ? 'metric-excellent' : (analysis.contentQualityAnalysis as any)?.overallHealth?.qualityScore >= 60 ? 'metric-good' : 'metric-warning'}">
                  <div class="metric-value">${formatScore((analysis.contentQualityAnalysis as any)?.overallHealth?.qualityScore)}</div>
                  <div class="metric-label">Quality Score</div>
                </div>
                <div class="metric-card ${(analysis.contentQualityAnalysis as any)?.contentUniqueness?.uniquenessScore >= 80 ? 'metric-excellent' : (analysis.contentQualityAnalysis as any)?.contentUniqueness?.uniquenessScore >= 60 ? 'metric-good' : 'metric-warning'}">
                  <div class="metric-value">${formatScore((analysis.contentQualityAnalysis as any)?.contentUniqueness?.uniquenessScore)}</div>
                  <div class="metric-label">Uniqueness Score</div>
                </div>
              </div>
              
              ${(analysis.contentQualityAnalysis as any)?.contentUniqueness?.totalDuplicates > 0 ? `
                <h4>⚠️ Content Duplication Issues</h4>
                <p><strong>Total Duplicates Found:</strong> ${(analysis.contentQualityAnalysis as any).contentUniqueness.totalDuplicates} across ${(analysis.contentQualityAnalysis as any).contentUniqueness.pagesAnalyzed} pages</p>
                
                ${(analysis.contentQualityAnalysis as any).contentUniqueness.duplicateContent.titles?.length > 0 ? `
                  <h5>Duplicate Titles:</h5>
                  ${(analysis.contentQualityAnalysis as any).contentUniqueness.duplicateContent.titles.map((group: any) => `
                    <div class="issue-container issue-warning">
                      <div class="issue-title">"${group.content}"</div>
                      <div class="issue-description">Found on ${group.urls.length} pages (${group.impactLevel} impact)</div>
                      <div class="issue-recommendation">${group.improvementStrategy}</div>
                    </div>
                  `).join('')}
                ` : ''}
                
                ${(analysis.contentQualityAnalysis as any).contentUniqueness.duplicateContent.descriptions?.length > 0 ? `
                  <h5>Duplicate Meta Descriptions:</h5>
                  ${(analysis.contentQualityAnalysis as any).contentUniqueness.duplicateContent.descriptions.map((group: any) => `
                    <div class="issue-container issue-warning">
                      <div class="issue-title">"${group.content}"</div>
                      <div class="issue-description">Found on ${group.urls.length} pages (${group.impactLevel} impact)</div>
                      <div class="issue-recommendation">${group.improvementStrategy}</div>
                    </div>
                  `).join('')}
                ` : ''}
              ` : '<p>✅ No significant content duplication found.</p>'}
              
              ${(analysis.contentQualityAnalysis as any)?.strategicRecommendations?.length > 0 ? `
                <h4>🎯 Strategic Recommendations</h4>
                ${(analysis.contentQualityAnalysis as any).strategicRecommendations.map((rec: any) => `
                  <div class="issue-container ${rec.priority === 'Critical' ? 'issue-critical' : rec.priority === 'High' ? 'issue-warning' : 'issue-info'}">
                    <div class="issue-title">${rec.title} (${rec.priority} Priority)</div>
                    <div class="issue-description"><strong>Category:</strong> ${rec.category}</div>
                    <div class="issue-description">${rec.description}</div>
                    <div class="issue-recommendation"><strong>Implementation:</strong> ${rec.implementation}</div>
                    <div class="issue-recommendation"><strong>Expected Impact:</strong> ${rec.expectedImpact}</div>
                  </div>
                `).join('')}
              ` : ''}
            </div>
          ` : ''}

          ${analysis.enhancedInsights ? `
            <div class="print-break"></div>
            <h2>🚀 Enhanced AI Insights</h2>
            <div class="insights-section">
              ${(analysis.enhancedInsights as any)?.technicalSeoInsights ? `
                <h3>🔧 Technical SEO Insights</h3>
                <div class="technical-details">
                  <h4>Performance Analysis:</h4>
                  <p>${(analysis.enhancedInsights as any).technicalSeoInsights.performanceAnalysis || 'No performance analysis available'}</p>
                  
                  <h4>Mobile Optimization:</h4>
                  <p>${(analysis.enhancedInsights as any).technicalSeoInsights.mobileOptimization || 'No mobile optimization analysis available'}</p>
                  
                  <h4>Technical Recommendations:</h4>
                  ${(analysis.enhancedInsights as any).technicalSeoInsights.technicalRecommendations ? `
                    <ul>
                      ${(analysis.enhancedInsights as any).technicalSeoInsights.technicalRecommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
                    </ul>
                  ` : '<p>No specific technical recommendations available.</p>'}
                </div>
              ` : ''}
              
              ${(analysis.enhancedInsights as any)?.contentQualityInsights ? `
                <h3>📖 Content Quality Insights</h3>
                <div class="technical-details">
                  <h4>Content Strategy:</h4>
                  <p>${(analysis.enhancedInsights as any).contentQualityInsights.contentStrategy || 'No content strategy analysis available'}</p>
                  
                  <h4>User Experience:</h4>
                  <p>${(analysis.enhancedInsights as any).contentQualityInsights.userExperience || 'No user experience analysis available'}</p>
                  
                  <h4>Content Recommendations:</h4>
                  ${(analysis.enhancedInsights as any).contentQualityInsights.contentRecommendations ? `
                    <ul>
                      ${(analysis.enhancedInsights as any).contentQualityInsights.contentRecommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
                    </ul>
                  ` : '<p>No specific content recommendations available.</p>'}
                </div>
              ` : ''}
              
              ${(analysis.enhancedInsights as any)?.linkArchitectureInsights ? `
                <h3>🔗 Link Architecture Insights</h3>
                <div class="technical-details">
                  <h4>Internal Linking:</h4>
                  <p>${(analysis.enhancedInsights as any).linkArchitectureInsights.internalLinking || 'No internal linking analysis available'}</p>
                  
                  <h4>Navigation Structure:</h4>
                  <p>${(analysis.enhancedInsights as any).linkArchitectureInsights.navigationStructure || 'No navigation analysis available'}</p>
                  
                  <h4>Link Recommendations:</h4>
                  ${(analysis.enhancedInsights as any).linkArchitectureInsights.linkRecommendations ? `
                    <ul>
                      ${(analysis.enhancedInsights as any).linkArchitectureInsights.linkRecommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
                    </ul>
                  ` : '<p>No specific link recommendations available.</p>'}
                </div>
              ` : ''}
            </div>
          ` : ''}

          ${analysis.competitorAnalysis ? `
            <div class="print-break"></div>
            <h2>🥊 Competitor Analysis</h2>
            <div class="competitor-section">
              <h3>Performance Comparison</h3>
              ${(analysis.competitorAnalysis as any)?.comparison ? `
                <div class="table-responsive">
                  <table>
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Your Site</th>
                        <th>Competitor</th>
                        <th>Difference</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${Object.entries((analysis.competitorAnalysis as any).comparison).map(([key, value]: [string, any]) => `
                        <tr>
                          <td>${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</td>
                          <td>${value.yours || 'N/A'}</td>
                          <td>${value.competitor || 'N/A'}</td>
                          <td style="color: ${value.difference > 0 ? '#28a745' : value.difference < 0 ? '#dc3545' : '#6c757d'}">
                            ${value.difference > 0 ? '+' : ''}${value.difference || 0}
                          </td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : '<p>No detailed comparison data available.</p>'}
              
              ${(analysis.competitorAnalysis as any)?.recommendations?.length > 0 ? `
                <h4>Competitive Recommendations:</h4>
                <ul>
                  ${(analysis.competitorAnalysis as any).recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          ` : ''}

          <div class="print-break"></div>
          <h2>📄 Detailed Page Analysis</h2>
          ${(analysis.pages as any[])?.map((page: any, index: number) => `
            <div class="page-section">
              <div class="page-header">
                <h3>Page ${index + 1}: ${page.pageName || 'Unknown Page'}</h3>
                <p>🔗 ${page.url}</p>
              </div>
              
              <div class="meta-info">
                <div class="meta-card">
                  <h4>📋 Basic Information</h4>
                  <p><strong>Title:</strong> ${page.title || 'Missing'} ${page.title ? `(${page.title.length} chars)` : ''}</p>
                  <p><strong>Meta Description:</strong> ${page.metaDescription || 'Missing'} ${page.metaDescription ? `(${page.metaDescription.length} chars)` : ''}</p>
                  <p><strong>Canonical URL:</strong> ${page.canonical || 'Not set'}</p>
                  <p><strong>Robots Meta:</strong> ${page.robotsMeta || 'Not set'}</p>
                  <p><strong>HTML Lang:</strong> ${page.htmlLang || 'Not set'}</p>
                  <p><strong>Viewport:</strong> ${page.viewport || 'Not set'}</p>
                  <p><strong>Mobile Optimized:</strong> ${page.mobileOptimized ? '✅ Yes' : '❌ No'}</p>
                </div>
                
                <div class="meta-card">
                  <h4>📊 Content Metrics</h4>
                  ${page.contentMetrics ? `
                    <p><strong>Word Count:</strong> ${page.contentMetrics.wordCount || 0}</p>
                    <p><strong>Readability Score:</strong> ${formatScore(page.contentMetrics.readabilityScore)}</p>
                    <p><strong>Content Depth:</strong> ${formatScore(page.contentMetrics.contentDepth)}</p>
                    <p><strong>Headings:</strong> ${(page.headings || []).length} total</p>
                    <p><strong>Images:</strong> ${(page.images || []).length} total</p>
                    <p><strong>Internal Links:</strong> ${(page.internalLinks || []).length}</p>
                    <p><strong>External Links:</strong> ${(page.externalLinks || []).length}</p>
                  ` : `
                    <p><strong>Headings:</strong> ${(page.headings || []).length} total</p>
                    <p><strong>Images:</strong> ${(page.images || []).length} total</p>
                    <p><strong>Internal Links:</strong> ${(page.internalLinks || []).length}</p>
                  `}
                </div>
              </div>
              
              ${page.keywordDensity && page.keywordDensity.length > 0 ? `
                <h4>🔍 Top Keywords</h4>
                <div style="margin: 10px 0;">
                  ${page.keywordDensity.slice(0, 10).map((kw: any) => `
                    <span class="keyword-density">${kw.keyword}: ${kw.count} (${(kw.density * 100).toFixed(1)}%)</span>
                  `).join('')}
                </div>
              ` : ''}
              
              ${page.semanticKeywords && page.semanticKeywords.length > 0 ? `
                <h4>🎯 Semantic Keywords</h4>
                <p>${page.semanticKeywords.slice(0, 10).join(', ')}</p>
              ` : ''}
              
              ${page.issues && page.issues.length > 0 ? `
                <h4>⚠️ SEO Issues (${page.issues.length})</h4>
                ${page.issues.map((issue: any) => `
                  <div class="issue-container issue-${issue.severity}">
                    <div class="issue-title">${issue.title}</div>
                    <div class="issue-description">${issue.description}</div>
                    ${issue.recommendation ? `<div class="issue-recommendation">💡 ${issue.recommendation}</div>` : ''}
                  </div>
                `).join('')}
              ` : '<p>✅ No SEO issues found on this page.</p>'}
              
              ${page.suggestions && page.suggestions.length > 0 ? `
                <div class="suggestions-list">
                  <h4>💡 AI-Powered Suggestions</h4>
                  <ul>
                    ${page.suggestions.map((suggestion: string) => `<li>${suggestion}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
              
              ${page.images && page.images.length > 0 ? `
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
                      ${page.images.map((img: any) => `
                        <tr>
                          <td>${img.src.length > 50 ? img.src.substring(0, 50) + '...' : img.src}</td>
                          <td>${img.alt || 'Missing'}</td>
                          <td>${img.suggestedAlt || 'N/A'}</td>
                          <td>${img.alt ? '✅' : '❌'}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              ` : ''}
              
              ${page.openGraph ? `
                <h4>📱 Open Graph Data</h4>
                <div class="technical-details">
                  <p><strong>Title:</strong> ${(page.openGraph as any).title || 'Not set'}</p>
                  <p><strong>Description:</strong> ${(page.openGraph as any).description || 'Not set'}</p>
                  <p><strong>Image:</strong> ${(page.openGraph as any).image || 'Not set'}</p>
                  <p><strong>Type:</strong> ${(page.openGraph as any).type || 'Not set'}</p>
                </div>
              ` : ''}
              
              ${page.twitterCard ? `
                <h4>🐦 Twitter Card Data</h4>
                <div class="technical-details">
                  <p><strong>Card:</strong> ${(page.twitterCard as any).card || 'Not set'}</p>
                  <p><strong>Title:</strong> ${(page.twitterCard as any).title || 'Not set'}</p>
                  <p><strong>Description:</strong> ${(page.twitterCard as any).description || 'Not set'}</p>
                  <p><strong>Image:</strong> ${(page.twitterCard as any).image || 'Not set'}</p>
                </div>
              ` : ''}
            </div>
          `).join('')}
          
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
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename=analysis-${id}.html`);
      res.send(pdfHtml);

    } catch (error) {
      res.status(500).json({ error: "Failed to export analysis as PDF" });
    }
  });

  // Export analysis as CSV
  app.get("/api/analysis/:id/export/csv", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

      // Generate CSV content
      let csv = "URL,Title,Title Length,Meta Description,Description Length,Headings,Issues,Suggestions\n";

      (analysis.pages as any[])?.forEach((page: any) => {
        const row = [
          `"${page.url}"`,
          `"${page.title || ''}"`,
          page.title?.length || 0,
          `"${page.metaDescription || ''}"`,
          page.metaDescription?.length || 0,
          `"${(page.headings as any[])?.map((h: any) => `${h.level}: ${h.text}`).join('; ') || ''}"`,
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
  app.get("/api/analysis/:id/export/json", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const mainAnalysis = await storage.getLatestAnalysisByDomain(mainDomain) as any;
      if (!mainAnalysis) {
        return res.status(404).json({ error: "No analysis found for main domain" });
      }

      try {
        // Check if user is authenticated and get their usage
        let userId: string | undefined;
        if (req.isAuthenticated && req.isAuthenticated()) {
          userId = (req.user as any).claims.sub;
          const usage = await storage.getUserUsage(userId!);
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

          // Check if user has enough credits for basic competitor analysis (1 credit required)
          const basicAnalysisCost = 1;
          if (usage && usage.credits < basicAnalysisCost) {
            return res.status(403).json({
              error: "Insufficient credits",
              message: `Competitor analysis requires ${basicAnalysisCost} credit. You have ${usage.credits} credits remaining.`,
              creditsNeeded: basicAnalysisCost,
              creditsAvailable: usage.credits
            });
          }

          // Deduct 1 credit for basic competitor analysis
          const creditResult = await storage.atomicDeductCredits(userId!, basicAnalysisCost);
          if (!creditResult.success) {
            return res.status(403).json({
              error: "Insufficient credits",
              message: `Competitor analysis requires ${basicAnalysisCost} credit. You have ${creditResult.remainingCredits} credits remaining.`,
              creditsNeeded: basicAnalysisCost,
              creditsAvailable: creditResult.remainingCredits
            });
          }

          console.log(`Deducted ${basicAnalysisCost} credit for competitor analysis. User ${userId} has ${creditResult.remainingCredits} credits remaining.`);
        } else {
          // Unauthenticated users cannot use competitor analysis
          return res.status(401).json({
            error: "Authentication required",
            message: "Please log in to use competitor analysis."
          });
        }

        // Analyze the competitor domain using the modular orchestrator
        const { orchestrateAnalysis } = await import("../analysis-pipeline/analysis-orchestrator");
        const settings = await storage.getSettings(userId!);
        const competitorSettings = {
          ...settings,
          useSitemap: true,
          skipAltTextGeneration: true, // Skip alt text for competitors
          useAI: false // Skip AI for basic competitor analysis
        };

        const competitorResult = await orchestrateAnalysis(
          competitorDomain,
          competitorSettings,
          userId!,
          undefined,
          true, // isCompetitorAnalysis
          analysisEvents
        );

        const competitorAnalysisId = competitorResult.analysisId;

        // Get the competitor analysis results
        const competitorAnalysis = await storage.getAnalysisById(competitorAnalysisId) as any;
        if (!competitorAnalysis) {
          return res.status(404).json({ error: "Competitor analysis failed" });
        }

        // Use the new modular competitive analysis system
        console.log('Running comprehensive competitive analysis...');

        // Prepare OpenAI client for AI insights (if available)
        let openaiClient: OpenAI | undefined;
        if (process.env.OPENAI_API_KEY) {
          openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        }

        // Run comprehensive competitive analysis using proper function signature
        const { analyzeCompetitor } = await import("../competitive-analysis/competitive-analyzer");
        const competitiveResult = await analyzeCompetitor(
          mainAnalysis,
          competitorAnalysis,
          openaiClient,
          { includeAI: false, maxTokens: 8000, analysisDepth: 'standard', focusAreas: ['SEO', 'Content'] }
        );

        // Create enhanced comparison result
        const comparison = {
          mainDomain,
          competitorDomain,
          // Use the enhanced metrics from the modular system
          metrics: competitiveResult.metrics,
          // Include detailed gap analysis
          gaps: competitiveResult.gaps,
          // Include strategy comparison
          strategies: competitiveResult.strategies,
          // Include processing stats
          stats: competitiveResult.processingStats,
          // Include optimized analysis data
          analysis: {
            ...competitorAnalysis,
            pages: (competitorAnalysis.pages as any[])?.map((page: any) => ({
              ...page,
              paragraphs: page.paragraphs ? page.paragraphs.slice(0, 2) : [],
              suggestions: page.suggestions ? page.suggestions.slice(0, 3) : []
            }))
          },
          recommendations: []
        };

        // Generate enhanced recommendations using the modular system
        try {
          const aiInsightsCost = 2;
          let enhancedInsights: any[] = [];

          if (userId) {
            const userUsage = await storage.getUserUsage(userId);
            const isTrialUser = userUsage?.accountStatus === "trial";

            if (isTrialUser) {
              // Trial users now pay 2 credits for competitor analysis
              const creditResult = await storage.atomicDeductCredits(userId, aiInsightsCost);
              if (creditResult.success) {
                enhancedInsights = competitiveResult.insights;
                console.log(`Trial user ${userId}: used enhanced modular recommendations (${enhancedInsights.length} insights, ${aiInsightsCost} credits used)`);
              } else {
                return res.status(402).json({ 
                  error: 'Insufficient credits for competitor analysis. Purchase more credits to continue.',
                  remainingCredits: creditResult.remainingCredits,
                  requiredCredits: aiInsightsCost
                });
              }
            } else {
              // Paid users get AI-powered insights if they have credits
              const creditResult = await storage.atomicDeductCredits(userId, aiInsightsCost);
              if (creditResult.success) {
                // Use the modular system with AI enhancement
                const aiEnhancedResult = await analyzeCompetitor(
                  mainAnalysis,
                  competitorAnalysis,
                  openaiClient,
                  { includeAI: true, maxTokens: 2000 }
                );
                enhancedInsights = aiEnhancedResult.insights;
                console.log(`Generated ${enhancedInsights.length} AI-enhanced competitive insights for user ${userId} (${aiInsightsCost} credits used)`);
              } else {
                // Fallback to modular system without AI
                enhancedInsights = competitiveResult.insights;
                console.log(`Insufficient credits for AI insights, using enhanced modular recommendations for user ${userId}`);
              }
            }
          } else {
            // Unauthenticated users get modular system insights (better than basic)
            enhancedInsights = competitiveResult.insights;
          }

          // Convert insights to the expected format and add summary information
          (comparison as any).recommendations = enhancedInsights.map((insight: any) => insight.recommendation);
          (comparison as any).detailedInsights = enhancedInsights;
          (comparison as any).competitiveSummary = competitiveResult.summary;
        } catch (aiError) {
          console.error("Error generating enhanced competitor insights:", aiError);
          // Fallback to basic recommendations
          (comparison as any).recommendations = generateBasicCompetitorRecommendations(comparison.metrics);
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

  // Content duplication analysis is now integrated into the main analysis pipeline
  // and available in the unified content quality analysis

  // Keyword repetition analysis is now integrated into the main analysis pipeline
  // and available in the unified content quality analysis

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

      // Check user has credits for reanalysis and deduct them
      const usage = await storage.getUserUsage(userId);
      if (usage && usage.credits < 1) {
        return res.status(403).json({ 
          error: "Insufficient credits", 
          message: `Page reanalysis requires 1 credit. You have ${usage.credits} credits remaining.`,
          creditsNeeded: 1,
          creditsAvailable: usage.credits
        });
      }

      // Deduct 1 credit for page reanalysis
      if (usage) {
        const creditResult = await storage.atomicDeductCredits(userId, 1);
        if (!creditResult.success) {
          return res.status(403).json({
            error: "Insufficient credits",
            message: `Page reanalysis requires 1 credit. You have ${creditResult.remainingCredits} credits remaining.`,
            creditsNeeded: 1,
            creditsAvailable: creditResult.remainingCredits
          });
        }
        console.log(`Deducted 1 credit for page reanalysis. User ${userId} has ${creditResult.remainingCredits} credits remaining.`);
      }

      // Get user settings
      const settings = await storage.getSettings(userId);

      // Import the analyzePage function from seoAnalyzer
      const { analyzePage } = await import('../seoAnalyzer');

      // Create abort controller for this specific reanalysis
      const controller = new AbortController();

      // Reanalyze the specific page with saved business context
      const updatedPageAnalysis = await analyzePage(pageUrl, settings, controller.signal, false, analysis.pages as any[], undefined, analysis.siteOverview);

      if (!updatedPageAnalysis) {
        return res.status(500).json({ error: "Failed to reanalyze page" });
      }

      // Preserve or regenerate AI suggestions
      const originalPage = (analysis.pages as any[]).find(p => p.url === pageUrl);
      
      if (settings.useAI && originalPage) {
        try {
          // Import the AI suggestions generator
          const { generateSeoSuggestions } = await import('../analysis-pipeline/ai-suggestions');
          
          // Prepare page data for AI analysis (same format as insights generator)
          const pageData = {
            url: updatedPageAnalysis.url,
            title: updatedPageAnalysis.title,
            metaDescription: updatedPageAnalysis.metaDescription,
            metaKeywords: updatedPageAnalysis.metaKeywords,
            headings: updatedPageAnalysis.headings,
            images: updatedPageAnalysis.images.map(img => ({
              src: img.src,
              alt: img.alt
            })),
            issues: updatedPageAnalysis.issues.map(issue => ({
              category: issue.category,
              severity: issue.severity,
              title: issue.title,
              description: issue.description
            })),
            paragraphs: updatedPageAnalysis.paragraphs ? updatedPageAnalysis.paragraphs.slice(0, 15) : [],
            internalLinks: updatedPageAnalysis.internalLinks,
            ctaElements: updatedPageAnalysis.ctaElements
          };

          // Generate fresh suggestions for the reanalyzed page
          const suggestions = await generateSeoSuggestions(
            updatedPageAnalysis.url, 
            pageData, 
            undefined, // site structure
            analysis.siteOverview as any, 
            undefined // additional info
          );

          if (Array.isArray(suggestions) && suggestions.length > 0) {
            // Determine if user is trial user based on credits
            const isTrialUser = usage && usage.credits === 0;
            
            if (isTrialUser) {
              // Trial users get limited suggestions
              const limitedSuggestions = suggestions.slice(0, 5);
              (updatedPageAnalysis as any).suggestions = limitedSuggestions;
              
              if (suggestions.length > 5) {
                const remainingSuggestions = suggestions.length - 5;
                (updatedPageAnalysis as any).suggestionsTeaser = `${remainingSuggestions} additional insights available with paid credits`;
              }
              console.log(`Regenerated ${limitedSuggestions.length} suggestions for trial user (${suggestions.length - limitedSuggestions.length} more available)`);
            } else {
              // Paid users get all suggestions
              (updatedPageAnalysis as any).suggestions = suggestions;
              console.log(`Regenerated ${suggestions.length} suggestions for paid user`);
            }
          } else {
            console.warn(`No suggestions generated for ${pageUrl}, preserving existing`);
            // Preserve existing suggestions if no new ones generated
            if (originalPage.suggestions) {
              (updatedPageAnalysis as any).suggestions = originalPage.suggestions;
            }
            if (originalPage.suggestionsTeaser) {
              (updatedPageAnalysis as any).suggestionsTeaser = originalPage.suggestionsTeaser;
            }
          }
        } catch (error) {
          console.warn(`Failed to regenerate suggestions for ${pageUrl}, preserving existing:`, error);
          // Preserve existing suggestions if regeneration fails
          if (originalPage.suggestions) {
            (updatedPageAnalysis as any).suggestions = originalPage.suggestions;
          }
          if (originalPage.suggestionsTeaser) {
            (updatedPageAnalysis as any).suggestionsTeaser = originalPage.suggestionsTeaser;
          }
        }
      } else if (originalPage) {
        // If AI suggestions are disabled, preserve existing suggestions
        if (originalPage.suggestions) {
          (updatedPageAnalysis as any).suggestions = originalPage.suggestions;
        }
        if (originalPage.suggestionsTeaser) {
          (updatedPageAnalysis as any).suggestionsTeaser = originalPage.suggestionsTeaser;
        }
      }

      // Update the analysis with the new page data
      const updatedAnalysis = await storage.updatePageInAnalysis(analysisId, pageUrl, updatedPageAnalysis);

      if (!updatedAnalysis) {
        return res.status(500).json({ error: "Failed to update analysis with new page data" });
      }

      // Increment user's page usage count for reanalysis
      // This line is no longer needed as credits are deducted directly
      // await storage.incrementUserUsage(userId, 1);

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