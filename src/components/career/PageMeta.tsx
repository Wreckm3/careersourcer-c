import { useEffect } from "react";

const SITE_NAME = "CareerSourcer";
const DEFAULT_DESCRIPTION =
  "A premium, project-first learning platform. Pick a direction, build real projects, and grow a portfolio.";

interface PageMetaProps {
  title: string;
  description?: string;
}

function setMeta(selector: string, attribute: "content" | "href", value: string) {
  const element = document.head.querySelector(selector);
  if (element) element.setAttribute(attribute, value);
}

export function PageMeta({ title, description = DEFAULT_DESCRIPTION }: PageMetaProps) {
  useEffect(() => {
    const fullTitle = title === SITE_NAME ? SITE_NAME : `${title} | ${SITE_NAME}`;
    const url = window.location.href;

    document.title = fullTitle;
    setMeta('meta[name="description"]', "content", description);
    setMeta('meta[property="og:title"]', "content", fullTitle);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[name="twitter:title"]', "content", fullTitle);
    setMeta('meta[name="twitter:description"]', "content", description);
    setMeta('link[rel="canonical"]', "href", url);
  }, [title, description]);

  return null;
}
