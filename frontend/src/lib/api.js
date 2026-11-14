import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = axios.create({ baseURL: `${BACKEND_URL}/api` });

// Dashboard
export const fetchDashboardStats = () => API.get("/dashboard/stats").then(r => r.data);
export const fetchRecentActivity = (limit = 20) => API.get(`/dashboard/recent-activity?limit=${limit}`).then(r => r.data);

// Projects
export const fetchProjects = (params) => API.get("/projects", { params }).then(r => r.data);
export const createProject = (data) => API.post("/projects", data).then(r => r.data);
export const fetchProject = (id) => API.get(`/projects/${id}`).then(r => r.data);
export const updateProject = (id, data) => API.put(`/projects/${id}`, data).then(r => r.data);
export const deleteProject = (id) => API.delete(`/projects/${id}`).then(r => r.data);
export const updateRepoConfig = (id, data) => API.put(`/projects/${id}/repository`, data).then(r => r.data);
export const updateAppConfig = (id, data) => API.put(`/projects/${id}/application`, data).then(r => r.data);

// Documents
export const uploadDocument = (projectId, docType, file) => {
  const fd = new FormData();
  fd.append("doc_type", docType);
  fd.append("file", file);
  return API.post(`/projects/${projectId}/documents`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then(r => r.data);
};
export const fetchDocuments = (projectId) => API.get(`/projects/${projectId}/documents`).then(r => r.data);
export const fetchDocument = (id) => API.get(`/documents/${id}`).then(r => r.data);
export const deleteDocument = (id) => API.delete(`/documents/${id}`).then(r => r.data);

// Providers
export const fetchProviders = () => API.get("/providers").then(r => r.data);
export const createProvider = (data) => API.post("/providers", data).then(r => r.data);
export const updateProvider = (id, data) => API.put(`/providers/${id}`, data).then(r => r.data);
export const deleteProvider = (id) => API.delete(`/providers/${id}`).then(r => r.data);
export const validateProvider = (id) => API.post(`/providers/${id}/validate`).then(r => r.data);
export const setProviderKey = (id) => API.post(`/providers/${id}/set-key`).then(r => r.data);

// Models
export const fetchModels = (params) => API.get("/models", { params }).then(r => r.data);
export const createModel = (data) => API.post("/models", data).then(r => r.data);
export const deleteModel = (id) => API.delete(`/models/${id}`).then(r => r.data);

// Model Assignments
export const fetchAssignments = (params) => API.get("/model-assignments", { params }).then(r => r.data);
export const createAssignment = (data) => API.post("/model-assignments", data).then(r => r.data);
export const deleteAssignment = (id) => API.delete(`/model-assignments/${id}`).then(r => r.data);

// Task Types
export const fetchTaskTypes = () => API.get("/task-types").then(r => r.data);

// Audit Logs
export const fetchAuditLogs = (params) => API.get("/audit-logs", { params }).then(r => r.data);

export default API;
