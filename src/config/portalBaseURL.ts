const getPortalBaseURL = (): string => {
  if (import.meta.env.DEV) {
    return "http://192.168.1.92:5001/api/";
  }

  const { protocol, hostname } = window.location;

  if (hostname === "pukalerp.in") {
    return `${protocol}//pukalerp.in/api/`;
  }

  return `${protocol}//${hostname}/api/`;
};

const portalBaseURL = getPortalBaseURL();
export default portalBaseURL;
