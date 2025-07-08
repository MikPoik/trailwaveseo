import { apiRequest } from './queryClient';
import type { AnalyzeRequestBody, WebsiteAnalysis, SettingsData } from './types';

// Analysis related API functions
export async function analyzeWebsite(data: AnalyzeRequestBody): Promise<Response> {
  return await apiRequest('POST', '/api/analyze', data);
}

export async function getAnalysisHistory(): Promise<WebsiteAnalysis[]> {
  const response = await apiRequest('GET', '/api/analysis/history');
  return await response.json();
}

export async function getAnalysisById(id: number): Promise<WebsiteAnalysis> {
  const response = await apiRequest('GET', `/api/analysis/${id}`);
  return await response.json();
}

export async function deleteAnalysis(id: number): Promise<void> {
  await apiRequest('DELETE', `/api/analysis/${id}`);
}

// Settings related API functions
export async function getSettings(): Promise<SettingsData> {
  const response = await apiRequest('GET', '/api/settings');
  return await response.json();
}

export async function updateSettings(settings: SettingsData): Promise<void> {
  await apiRequest('POST', '/api/settings', settings);
}

// Export utilities
export async function exportAnalysisCSV(id: number): Promise<Blob> {
  const response = await apiRequest('GET', `/api/analysis/${id}/export/csv`);
  return await response.blob();
}

export async function exportAnalysisJSON(id: number): Promise<Blob> {
  const response = await apiRequest('GET', `/api/analysis/${id}/export/json`);
  return await response.blob();
}

// Competitor analysis
export interface CompetitorAnalysisRequest {
  mainDomain: string;
  competitorDomain: string;
}

export async function compareWithCompetitor(data: CompetitorAnalysisRequest): Promise<any> {
  try {
    const response = await apiRequest('POST', '/api/analyze/compare', data);
    return await response.json();
  } catch (error) {
    console.error("Error in competitor analysis API request:", error);
    throw error;
  }
}

export async function saveCompetitorAnalysis(analysisId: number, competitorData: any): Promise<any> {
  try {
    console.log(`Saving competitor analysis for ID ${analysisId}, data size: ${JSON.stringify(competitorData).length} bytes`);
    const response = await apiRequest('POST', `/api/analysis/${analysisId}/save-competitor`, competitorData);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save competitor analysis: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`Successfully saved competitor analysis for ID ${analysisId}`);
    return result;
  } catch (error) {
    console.error("Error saving competitor analysis:", error);
    throw error;
  }
}

export const runContentDuplicationAnalysis = async (analysisId: number) => {
  const response = await fetch(`/api/analysis/${analysisId}/content-duplication`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to run content duplication analysis');
  }

  return response.json();
};

export const reanalyzePage = async (analysisId: number, pageUrl: string) => {
  const response = await fetch(`/api/analysis/${analysisId}/reanalyze-page`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pageUrl }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to reanalyze page');
  }

  return response.json();
};