(function () {
    const normalize = (source, label, href, type = 'official') => ({ source, label, href, type });

    class JikanOfficialAdapter {
        constructor(fetchImpl = fetch) {
            this.fetch = fetchImpl;
            this.name = 'jikan-official';
        }

        async resolveMalId(title, malId) {
            if (malId) return malId;
            if (!title) return '';

            const res = await this.fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1&sfw=true`);
            if (!res.ok) return '';
            const payload = await res.json();
            return payload?.data?.[0]?.mal_id ? String(payload.data[0].mal_id) : '';
        }

        async getWatchLinks({ title, malId }) {
            const resolvedMalId = await this.resolveMalId(title, malId);
            if (!resolvedMalId) return [];

            const res = await this.fetch(`https://api.jikan.moe/v4/anime/${resolvedMalId}/full`);
            if (!res.ok) return [];

            const payload = await res.json();
            const streaming = payload?.data?.streaming || [];
            return streaming
                .filter(item => item?.name && item?.url)
                .map(item => normalize(this.name, item.name, item.url));
        }
    }

    class SearchFallbackAdapter {
        constructor() {
            this.name = 'search-fallback';
        }

        async getWatchLinks({ title, episode }) {
            const query = encodeURIComponent(`${title} episode ${episode}`);
            return [
                normalize(this.name, 'Crunchyroll Search', `https://www.crunchyroll.com/search?q=${query}`, 'search'),
                normalize(this.name, 'YouTube Search', `https://www.youtube.com/results?search_query=${query}`, 'search'),
                normalize(this.name, 'AniList', `https://anilist.co/search/anime?search=${encodeURIComponent(title)}`, 'search'),
                normalize(this.name, 'MyAnimeList', `https://myanimelist.net/anime.php?q=${encodeURIComponent(title)}`, 'search')
            ];
        }
    }

    class MockEducationalAdapter {
        constructor() {
            this.name = 'demo-adapter';
        }

        async getWatchLinks({ title, episode }) {
            return [
                normalize(this.name, `Demo Stream (${title} E${episode})`, 'https://example.com/demo-stream', 'demo')
            ];
        }
    }

    const getLinksWithFallback = async (context, adapters) => {
        for (const adapter of adapters) {
            const links = await adapter.getWatchLinks(context);
            if (links.length) {
                return { links, provider: adapter.name };
            }
        }
        return { links: [], provider: 'none' };
    };

    window.ProviderAdapters = {
        JikanOfficialAdapter,
        SearchFallbackAdapter,
        MockEducationalAdapter,
        getLinksWithFallback
    };
})();
