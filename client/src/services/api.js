// API Client for Story Creator
const API_BASE = '/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('story_admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const api = {
  // Public
  async getPublicStories(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/stories${query ? `?${query}` : ''}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch stories');
    return data.data;
  },

  async getPublicStory(slugOrId) {
    const res = await fetch(`${API_BASE}/stories/${slugOrId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Story not found');
    return data.data;
  },

  async getAudioPresets() {
    const res = await fetch(`${API_BASE}/audio/presets`);
    const data = await res.json();
    return data.presets || [];
  },

  async uploadAudio(file) {
    const formData = new FormData();
    formData.append('audio', file);

    const token = localStorage.getItem('story_admin_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    const res = await fetch(`${API_BASE}/audio/upload`, {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Audio upload failed');
    return data.data;
  },

  async getUploadedAudio() {
    const res = await fetch(`${API_BASE}/audio/uploaded`);
    const data = await res.json();
    return data.files || [];
  },

  // Auth
  async login(username, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    return data;
  },

  async verifyToken() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Invalid session');
    return data.user;
  },

  // Admin Stories CRUD
  async getAdminStories(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/stories/admin/all${query ? `?${query}` : ''}`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch admin stories');
    return data.data;
  },

  async getAdminStory(id) {
    const res = await fetch(`${API_BASE}/stories/admin/${id}`, {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to fetch story');
    return data.data;
  },

  async createStory(storyData) {
    const res = await fetch(`${API_BASE}/stories/admin`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(storyData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to create story');
    return data.data;
  },

  async updateStory(id, storyData) {
    const res = await fetch(`${API_BASE}/stories/admin/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(storyData)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to update story');
    return data.data;
  },

  async toggleStoryStatus(id) {
    const res = await fetch(`${API_BASE}/stories/admin/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to toggle status');
    return data.data;
  },

  async deleteStory(id) {
    const res = await fetch(`${API_BASE}/stories/admin/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to delete story');
    return data;
  }
};
