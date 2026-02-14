// src/config/portalBaseURL.ts

// export const getHostAPI = (): string => {
//   const { protocol, host } = window.location;
//   return `${protocol}//${host}/api/`;
// };

export const getHostAPI = (): string => {
  return `https://erpsmt.in/api/`;
  // return `http://localhost:9001/api/`;
};

export const getCompanyAPI = (): string => {
  const companyAPI = localStorage.getItem("COMPANY_API");

  if (companyAPI && companyAPI.startsWith("http")) {
    return companyAPI.endsWith("/") ? companyAPI : `${companyAPI}/`;
  }

  return "";
};

/**
 * Default export:
 * - Used by normal services
 * - After login → COMPANY_API
 * - Before login → HOST API
 */
export const getBaseURL = (): string => {
  const companyAPI = getCompanyAPI();
  return companyAPI || getHostAPI();
};
