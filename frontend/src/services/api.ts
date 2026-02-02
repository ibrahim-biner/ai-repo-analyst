/**
 * Backend API ile iletişim. Tüm isteklerde JWT Authorization header kullanılır.
 */
import axios from 'axios';

import { supabase } from '../supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

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
  const response = await axios.post<RepoIndexResponse>(`${API_URL}/repo/index`, { 
    repo_url: url,
    user_id: user_id
  }, { headers: headers });
  return response.data;
};

export const getUserRepos = async (user_id: string): Promise<UserRepo[]> => {
  const headers = await getAuthHeaders();
  const response = await axios.get<UserRepo[]>(`${API_URL}/repo/list`, {
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
  const response = await fetch(`${API_URL}/chat/ask`, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ 
      collection_name, 
      question, 
      user_id 
    }),
  });

  if (response.status === 429) {
    // Rate limit hatası
    const data = await response.json();
    throw new Error(data.detail || 'Günlük hakkınız doldu.');
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) return;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
};

export const saveMessage = async (user_id: string, repo_name: string, role: 'user' | 'ai', content: string) => {
  const headers = await getAuthHeaders();
  await axios.post(`${API_URL}/chat/save`, {
    user_id,
    repo_name,
    role,
    content
  },{ headers: headers });
};

export const getChatHistory = async (user_id: string, repo_name: string) => {
  const headers = await getAuthHeaders();
  const response = await axios.get(`${API_URL}/chat/history`, {
    params: { user_id, repo_name },
    headers: headers
  });
  return response.data;
};

export const deleteRepo = async (user_id: string, repo_name: string) => {
  const headers = await getAuthHeaders();
  const response = await axios.post(`${API_URL}/repo/delete`, {
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