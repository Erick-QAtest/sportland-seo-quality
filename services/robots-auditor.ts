
import robotsParser from 'robots-parser';

export function canCrawl(
  robotsText: string,
  robotsUrl: string,
  pageUrl: string,
  userAgent = 'Googlebot'
): boolean | undefined {

  // Analizar las reglas del robots.txt
  const robots = robotsParser(robotsUrl, robotsText);

  // Comprobar si el rastreador puede visitar la URL
  return robots.isAllowed(pageUrl, userAgent);
}
