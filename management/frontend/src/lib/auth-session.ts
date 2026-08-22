export const isLoggedIn = (): boolean =>
	localStorage.getItem("access_token") !== null;

export const clearAuthSession = () => {
	localStorage.removeItem("access_token");
	localStorage.removeItem("workspace_id");
	localStorage.removeItem("force_password_change");
};
