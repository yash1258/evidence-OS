import json
import sys
import warnings
from urllib.parse import parse_qs, quote, urlparse
from urllib.request import urlopen

warnings.filterwarnings(
    "ignore",
    message=r"urllib3 .* doesn't match a supported version!",
    category=Warning,
)

def emit_error(message: str, code: int = 1) -> None:
    sys.stderr.write(message)
    sys.exit(code)


try:
    from youtube_transcript_api import YouTubeTranscriptApi
except ModuleNotFoundError:
    emit_error(
        "youtube-transcript-api is not installed. Run `python -m pip install youtube-transcript-api`."
    )


def extract_video_id(raw_url: str) -> str:
    parsed = urlparse(raw_url)
    host = parsed.netloc.lower()

    if host.endswith("youtu.be"):
        return parsed.path.strip("/").split("/")[0]

    if "youtube.com" in host:
        if parsed.path == "/watch":
            return parse_qs(parsed.query).get("v", [""])[0]
        if parsed.path.startswith("/shorts/") or parsed.path.startswith("/embed/") or parsed.path.startswith("/live/"):
            return parsed.path.strip("/").split("/")[1]

    return ""


def fetch_oembed(video_url: str) -> dict:
    endpoint = f"https://www.youtube.com/oembed?url={quote(video_url, safe='')}&format=json"
    try:
        with urlopen(endpoint, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception:
        return {}


def pick_transcript(video_id: str, languages: list[str]):
    api = YouTubeTranscriptApi()

    try:
        return api.fetch(video_id, languages=languages)
    except Exception:
        transcript_list = api.list(video_id)

        for finder_name in ("find_transcript", "find_generated_transcript", "find_manually_created_transcript"):
            finder = getattr(transcript_list, finder_name, None)
            if finder is None:
                continue
            try:
                return finder(languages).fetch()
            except Exception:
                continue

        for transcript in transcript_list:
            try:
                return transcript.fetch()
            except Exception:
                continue

    raise RuntimeError("No transcript could be fetched for this video.")


def main() -> None:
    if len(sys.argv) < 2:
        emit_error("Usage: fetch_youtube_transcript.py <youtube_url> [language_code ...]")

    raw_url = sys.argv[1].strip()
    video_id = extract_video_id(raw_url)
    if not video_id:
        emit_error("Unable to extract a YouTube video ID from the provided URL.")

    requested_languages = [language for language in sys.argv[2:] if language.strip()] or ["en"]
    canonical_url = f"https://www.youtube.com/watch?v={video_id}"

    try:
        fetched_transcript = pick_transcript(video_id, requested_languages)
        transcript_rows = fetched_transcript.to_raw_data()
    except Exception as error:
        emit_error(str(error))

    segments = []
    for row in transcript_rows:
        text = str(row.get("text", "")).strip()
        if not text:
            continue

        start_seconds = float(row.get("start", 0.0))
        duration_seconds = float(row.get("duration", 0.0))
        end_seconds = start_seconds + max(duration_seconds, 0.0)

        segments.append(
            {
                "text": text,
                "startSeconds": start_seconds,
                "endSeconds": end_seconds,
                "durationSeconds": duration_seconds,
            }
        )

    if not segments:
        emit_error("Transcript was fetched, but it did not contain usable text.")

    metadata = fetch_oembed(canonical_url)

    output = {
        "videoId": video_id,
        "url": canonical_url,
        "title": metadata.get("title") or f"YouTube Video {video_id}",
        "channel": metadata.get("author_name") or "",
        "thumbnailUrl": metadata.get("thumbnail_url") or "",
        "language": getattr(fetched_transcript, "language", None),
        "languageCode": getattr(fetched_transcript, "language_code", None),
        "isGenerated": bool(getattr(fetched_transcript, "is_generated", False)),
        "segments": segments,
    }

    sys.stdout.write(json.dumps(output, ensure_ascii=True))


if __name__ == "__main__":
    main()
