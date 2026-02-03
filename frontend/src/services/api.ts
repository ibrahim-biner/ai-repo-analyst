/**
 * Backend API ile iletişim. Tüm isteklerde JWT Authorization header kullanılır.
 * Timeout: 180 saniye (büyük repo işlemleri için)
 */
import axios from 'axios';

import { supabase } from '../supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';
const REQUEST_TIMEOUT = 180000; // 180 saniye (3 dakika)

// Axios instance - timeout yapılandırmalı
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT,
});

export interface RepoIndexResponse {
  status: string;
  message: string;
  total_chunks: number;
  repo_name: string;
}

// App.tsx'in arayıp bulamadığı parça bu! Başındaki 'export' önemli.
export interface UserRepo {
  id: number;
  repo_name: string;
  repo_url: string;
  created_at: string;
}

export const indexRepo = async (url: string, user_id: string): Promise<RepoIndexResponse> => {
  const headers = await getAuthHeaders();
  const response = await apiClient.post<RepoIndexResponse>('/repo/index', { 
    repo_url: url,
    user_id: user_id
  }, { headers: headers });
  return response.data;
};

export const getUserRepos = async (user_id: string): Promise<UserRepo[]> => {
  const headers = await getAuthHeaders();
  const response = await apiClient.get<UserRepo[]>('/repo/list', {
    params: { user_id },
    headers: headers
  });
  return response.data;
};

export const chatWithRepo = async (
  collection_name: string,
  question: string,
  user_id: string,
  onChunk: (chunk: string) => void
) => {
  const headers = await getAuthHeaders();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(`${API_URL}/chat/ask`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ 
        collection_name, 
        question, 
        user_id 
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      // Rate limit hatası
      const data = await response.json();
      throw new Error(data.detail || 'Günlük hakkınız doldu.');
    }
    
    if (response.status === 504) {
      throw new Error('İşlem zaman aşımına uğradı. Lütfen daha kısa bir soru deneyin.');
    }
    
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.detail || 'Bir hata oluştu.');
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) return;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      onChunk(decoder.decode(value, { stream: true }));
    }
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('İstek zaman aşımına uğradı. Lütfen tekrar deneyin.');
    }
    throw error;
  }
};

export const saveMessage = async (user_id: string, repo_name: string, role: 'user' | 'ai', content: string) => {
  const headers = await getAuthHeaders();
  await apiClient.post('/chat/save', {
    user_id,
    repo_name,
    role,
    content
  },{ headers: headers });
};

export const getChatHistory = async (user_id: string, repo_name: string) => {
  const headers = await getAuthHeaders();
  const response = await apiClient.get('/chat/history', {
    params: { user_id, repo_name },
    headers: headers
  });
  return response.data;
};

export const deleteRepo = async (user_id: string, repo_name: string) => {
  const headers = await getAuthHeaders();
  const response = await apiClient.post('/repo/delete', {
    user_id,
    repo_name
  },{ headers: headers });
  return response.data;
};

export const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Oturum bulunamadı!");
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  };
};