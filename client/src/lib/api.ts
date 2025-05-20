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
    const response = await apiRequest('POST', `/api/analysis/${analysisId}/save-competitor`, competitorData);
    return await response.json();
  } catch (error) {
    console.error("Error saving competitor analysis:", error);
    throw error;
  }
}
