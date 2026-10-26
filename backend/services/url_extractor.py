import re
import urllib.parse
from typing import Dict, Any, Optional
import requests
from bs4 import BeautifulSoup

DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9"
}

def extract_article_from_url(url_input: str) -> Dict[str, Any]:
    url = url_input.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    parsed = urllib.parse.urlparse(url)
    protocol = parsed.scheme
    domain = parsed.netloc.lower()
    if domain.startswith("www."):
        domain = domain[4:]

    # Fallback structure
    result = {
        "url": url,
        "domain": domain,
        "protocol": protocol,
        "title": f"Article from {domain}",
        "publisher": domain.capitalize(),
        "author": "Editorial Staff",
        "publication_date": "Recent",
        "article_text": "",
        "metadata": {
            "status_code": 0,
            "canonical_url": url,
            "description": ""
        }
    }

    try:
        resp = requests.get(url, headers=DEFAULT_HEADERS, timeout=10, allow_redirects=True)
        result["metadata"]["status_code"] = resp.status_code
        if resp.status_code != 200:
            result["article_text"] = f"Unable to fetch content. HTTP status {resp.status_code}"
            return result

        soup = BeautifulSoup(resp.text, "html.parser")

        # Extract Title
        og_title = soup.find("meta", property="og:title")
        twitter_title = soup.find("meta", attrs={"name": "twitter:title"})
        tag_title = soup.find("title")
        h1 = soup.find("h1")

        if og_title and og_title.get("content"):
            result["title"] = og_title["content"].strip()
        elif twitter_title and twitter_title.get("content"):
            result["title"] = twitter_title["content"].strip()
        elif tag_title and tag_title.text:
            result["title"] = tag_title.text.strip()
        elif h1 and h1.text:
            result["title"] = h1.text.strip()

        # Clean pipe / dashes in title from site branding
        if " | " in result["title"]:
            result["title"] = result["title"].split(" | ")[0]
        elif " - " in result["title"]:
            parts = result["title"].split(" - ")
            if len(parts[0]) > 10:
                result["title"] = parts[0]

        # Extract Publisher / Site Name
        og_site = soup.find("meta", property="og:site_name")
        if og_site and og_site.get("content"):
            result["publisher"] = og_site["content"].strip()
        else:
            result["publisher"] = domain.split(".")[0].capitalize()

        # Extract Author
        meta_author = soup.find("meta", attrs={"name": "author"}) or soup.find("meta", property="article:author")
        if meta_author and meta_author.get("content"):
            result["author"] = meta_author["content"].strip()
        else:
            author_tag = soup.find(class_=re.compile(r'author|byline|writer', re.I))
            if author_tag and author_tag.text.strip():
                clean_auth = author_tag.text.strip().replace("By ", "").replace("by ", "")
                result["author"] = clean_auth[:60]

        # Extract Publication Date
        meta_date = (
            soup.find("meta", property="article:published_time") or
            soup.find("meta", attrs={"name": "date"}) or
            soup.find("meta", attrs={"name": "pubdate"}) or
            soup.find("meta", property="og:published_time")
        )
        if meta_date and meta_date.get("content"):
            result["publication_date"] = meta_date["content"].strip()[:25]
        else:
            time_tag = soup.find("time")
            if time_tag and time_tag.get("datetime"):
                result["publication_date"] = time_tag["datetime"][:25]
            elif time_tag and time_tag.text.strip():
                result["publication_date"] = time_tag.text.strip()[:25]

        # Extract Description
        meta_desc = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", property="og:description")
        if meta_desc and meta_desc.get("content"):
            result["metadata"]["description"] = meta_desc["content"].strip()

        # Extract Article Body
        for tag in soup(["script", "style", "nav", "footer", "header", "noscript", "aside", "form"]):
            tag.decompose()

        article_tag = soup.find("article") or soup.find("main") or soup.find(class_=re.compile(r'content|post-body|entry-content|article-body', re.I))
        paragraphs = []
        if article_tag:
            paragraphs = [p.get_text().strip() for p in article_tag.find_all("p") if len(p.get_text().strip()) > 35]

        if not paragraphs:
            paragraphs = [p.get_text().strip() for p in soup.find_all("p") if len(p.get_text().strip()) > 40]

        if paragraphs:
            result["article_text"] = "\n\n".join(paragraphs[:15])
        else:
            body_text = soup.get_text(separator=' ')
            clean_body = re.sub(r'\s+', ' ', body_text).strip()
            result["article_text"] = clean_body[:2500]

    except Exception as e:
        result["metadata"]["error"] = str(e)
        if not result["article_text"]:
            result["article_text"] = f"Extraction note: Could not parse remote URL directly ({str(e)}). Proceeding with domain and URL structure analysis."

    return result
