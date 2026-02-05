import baseURL from "../config/portalBaseURL";

interface FetchLinkParams<T = unknown> {
    address: string;
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    headers?: Record<string, string>;
    bodyData?: T | FormData | null;
    others?: RequestInit;
    autoHeaders?: boolean;
    loadingOn?: () => void;
    loadingOff?: () => void;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data: T[];
    message: string;
    others?: Record<string, unknown>;
}

export const fetchLink = async <T = unknown, R = T>({
    address,
    method = "GET",
    headers = {},
    bodyData = null,
    others = {},
    autoHeaders = false,
    loadingOn,
    loadingOff,
}: FetchLinkParams<T>): Promise<ApiResponse<R>> => {
    const token = localStorage.getItem('token');
    const isFormData = bodyData instanceof FormData;

    const defaultHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: 'Bearer ' + (token || ""),
    };

    const finalHeaders = autoHeaders
        ? defaultHeaders
        : { ...defaultHeaders, ...headers };

    if (isFormData) {
        delete finalHeaders["Content-Type"];
    }

    const options: RequestInit = {
        method,
        headers: finalHeaders,
        ...others,
    };

    if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
        options.body = isFormData ? (bodyData as FormData) : JSON.stringify(bodyData || {});
    }

    try {
        loadingOn?.();

        const response = await fetch(baseURL + address.replace(/\s+/g, ""), options);

        if (response.status === 401) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
            // Return a rejected promise instead of null
            throw new Error("Unauthorized");
        }

        if ((finalHeaders["Content-Type"] || "").includes("application/json")) {
            const json = await response.json() as ApiResponse<R>;
            return json;
        } else {
            // For non-JSON responses, create a proper ApiResponse object
            const text = await response.text();
            return {
                success: response.ok,
                data: [text as unknown as R],
                message: response.ok ? "Success" : "Failed",
            };
        }
        
    } catch (error) {
        console.error("Fetch Error", error);
        // Return a proper error response instead of throwing
        return {
            success: false,
            data: [],
            message: error instanceof Error ? error.message : "Unknown error occurred",
        };
    } finally {
        loadingOff?.();
    }
};