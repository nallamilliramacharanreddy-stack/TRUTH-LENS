import re
import urllib.parse
from typing import Dict, Any

TRUSTED_DOMAINS = {
    "reuters.com": {"publisher": "Reuters News Agency", "status": "TRUSTED", "info": "Global independent news organization known for rigorous fact-checking and editorial standards."},
    "apnews.com": {"publisher": "Associated Press", "status": "TRUSTED", "info": "Primary international wire service adhering to the highest journalistic accuracy guidelines."},
    "bbc.com": {"publisher": "BBC News", "status": "TRUSTED", "info": "British public service broadcaster with global editorial verification mechanisms."},
    "bbc.co.uk": {"publisher": "BBC News", "status": "TRUSTED", "info": "British public service broadcaster with global editorial verification mechanisms."},
    "nytimes.com": {"publisher": "The New York Times", "status": "INFORMATIONAL", "info": "Major news publication with established editorial oversight, subject to standard review."},
    "nature.com": {"publisher": "Nature Publishing Group", "status": "TRUSTED", "info": "Leading peer-reviewed international scientific journal."},
    "science.org": {"publisher": "Science / AAAS", "status": "TRUSTED", "info": "Peer-reviewed scientific journal with stringent academic validation."},
    "nasa.gov": {"publisher": "NASA Official", "status": "TRUSTED", "info": "Official United States civilian space and aeronautics agency."},
    "who.int": {"publisher": "World Health Organization", "status": "TRUSTED", "info": "United Nations specialized agency for international public health."},
    "cdc.gov": {"publisher": "Centers for Disease Control", "status": "TRUSTED", "info": "National public health institute of the United States."},
    "bloomberg.com": {"publisher": "Bloomberg L.P.", "status": "INFORMATIONAL", "info": "Financial, software, data, and media company with regulated market reporting."},
    "wsj.com": {"publisher": "The Wall Street Journal", "status": "INFORMATIONAL", "info": "Major financial newspaper published by Dow Jones & Company."},
    "theguardian.com": {"publisher": "The Guardian", "status": "INFORMATIONAL", "info": "Independent British news organization funded by the Scott Trust."},
    "nih.gov": {"publisher": "National Institutes of Health", "status": "TRUSTED", "info": "Primary agency of the US government responsible for biomedical research."}
}

SUSPICIOUS_DOMAINS = {
    "realtruthbuzz.com": {"publisher": "Real Truth Buzz", "status": "SUSPICIOUS", "info": "Identified clickbait outlet frequently syndicating fabricated sensational claims."},
    "bannedpatriotnews.org": {"publisher": "Patriot Voice Network", "status": "SUSPICIOUS", "info": "Conspiracy dissemination hub with repeated failed fact-checks."},
    "freedomconspiracyflash.net": {"publisher": "Freedom Flash", "status": "SUSPICIOUS", "info": "Anonymous offshore domain with zero verified editorial bylines."},
    "secretcancercure.org": {"publisher": "Alternative Health Secrets", "status": "SUSPICIOUS", "info": "Commercial front marketing unapproved remedies with false medical claims."},
    "viralbreakingleaks.co": {"publisher": "Viral Leaks Media", "status": "CAUTION", "info": "High-velocity clickbait domain aggregating uncorroborated social media rumors."}
}

def verify_source(url_or_domain: str, default_author: str = "Staff Writer", default_pub_date: str = "Recent") -> Dict[str, Any]:
    raw = (url_or_domain or "").strip()
    if not raw:
        return {
            "source_name": "Direct User Input",
            "domain": "direct-submission",
            "publisher": "User Submission",
            "author": default_author or "Unspecified",
            "publication_date": default_pub_date or "Today",
            "source_status": "INFORMATIONAL",
            "source_information": "Content submitted directly via detection input interface without an authoritative origin URL."
        }

    if not raw.startswith("http://") and not raw.startswith("https://"):
        url = "https://" + raw
    else:
        url = raw

    parsed = urllib.parse.urlparse(url)
    domain = parsed.netloc.lower()
    if domain.startswith("www."):
        domain = domain[4:]

    if not domain:
        domain = raw.split("/")[0].lower()

    if domain in TRUSTED_DOMAINS:
        meta = TRUSTED_DOMAINS[domain]
        return {
            "source_name": meta["publisher"],
            "domain": domain,
            "publisher": meta["publisher"],
            "author": default_author or "Editorial Staff",
            "publication_date": default_pub_date or "Verified Publication",
            "source_status": meta["status"],
            "source_information": meta["info"]
        }

    if domain in SUSPICIOUS_DOMAINS:
        meta = SUSPICIOUS_DOMAINS[domain]
        return {
            "source_name": meta["publisher"],
            "domain": domain,
            "publisher": meta["publisher"],
            "author": default_author or "Anonymous",
            "publication_date": default_pub_date or "Undated",
            "source_status": meta["status"],
            "source_information": meta["info"]
        }

    # Heuristic checks
    if any(domain.endswith(tld) for tld in [".gov", ".mil", ".edu"]):
        return {
            "source_name": f"{domain.split('.')[0].upper()} Official Domain",
            "domain": domain,
            "publisher": f"{domain.split('.')[0].upper()} Agency / Academic Institution",
            "author": default_author or "Official Contributor",
            "publication_date": default_pub_date or "Official Record",
            "source_status": "TRUSTED",
            "source_information": "Official institutional or government top-level domain with regulatory publication standards."
        }

    # Caution for raw blog / free hosting patterns
    if any(part in domain for part in ["wordpress", "blogspot", "wixsite", "weebly", "substack"]):
        return {
            "source_name": f"Independent Publication ({domain})",
            "domain": domain,
            "publisher": "Self-Published Creator / Independent Blog",
            "author": default_author or "Blog Author",
            "publication_date": default_pub_date or "Blog Post",
            "source_status": "CAUTION",
            "source_information": "User-generated blogging platform. Lacks centralized editorial verification boards; evaluate claims with external sources."
        }

    return {
        "source_name": domain.capitalize(),
        "domain": domain,
        "publisher": domain.capitalize(),
        "author": default_author or "Reported Contributor",
        "publication_date": default_pub_date or "Recent Web Article",
        "source_status": "INFORMATIONAL",
        "source_information": "Standard digital web source. Source credibility score is informational and evaluated alongside cross-checked evidence."
    }
