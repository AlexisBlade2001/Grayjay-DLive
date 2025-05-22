const URL_LIVE = "https://live.prd.dlive.tv";
const URL_LIVE_HLS = `${URL_LIVE}/hls/live`;

const GQL_URL = "https://graphigo.prd.dlive.tv";

const URL_BASE = "https://dlive.tv";
const URL_BASE_M = `${URL_BASE}/m`;
const URL_HOME_M = `${URL_BASE_M}/home`;

const URL_CHANNEL = `${URL_BASE}/u`;
const URL_CHANNEL_VIDEOS = `${URL_BASE}/v`;
const URL_CHANNEL_STREAMS = `${URL_BASE}/p`;
const URL_CHANNEL_CLIPS = `${URL_BASE}/clip`;
const URL_SEARCH_MOBILE = `${URL_BASE_M}/search`;
const URL_BROWSE = `${URL_BASE}/s/browse`;
const URL_LIVE_CHAT = `${URL_BASE}/c`;
const URL_FOLLOWING = `${URL_BASE}/s/following`;
const URL_SUBSCRIPTIONS = `${URL_BASE}/s/mysubscriptions`;

const PLATFORM = "DLive";

const REGEX_USER = new RegExp("dlive\\.tv\\/([a-zA-Z0-9-_]+)\\/?", "i");
const REGEX_USER_OLD = new RegExp("dlive\\.tv\\/([a-zA-Z0-9-_]+)\\+([a-zA-Z0-9-_]+)\\/?", "i");
const REGEX_CHANNEL_USER = new RegExp("dlive\\.tv\\/u\\/([a-zA-Z0-9-_]+)\\/?", "i");
const REGEX_CHANNEL_USER_OLD = new RegExp("dlive\\.tv\\/u\\/([a-zA-Z0-9-_]+)\\+([a-zA-Z0-9-_]+)\\/?", "i");
const REGEX_VOD = new RegExp("dlive\\.tv\\/p\\/([a-zA-Z0-9-_]+)\\+([a-zA-Z0-9-_]+)\\/?", "i");
const REGEX_VIDEO = new RegExp("dlive\\.tv\\/v\\/([a-zA-Z0-9-_]+)\\+([a-zA-Z0-9-_]+)\\/?", "i");
const REGEX_CLIP = new RegExp("dlive\\.tv\\/clip\\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\/?", "i");

var config = {};

source.enable = function (conf, settings, savedState) {
    /**
     * @param conf: SourceV8PluginConfig (the DLiveConfig.js)
     */

    config = conf ?? {};
}

source.getUserSubscriptions = function () {
    if (!bridge.isLoggedIn()) {
        bridge.log("Failed to retrieve subscriptions page because not logged in.");
        throw new LoginRequiredException("Not logged in");
    }

    let MeFollowingLivestreams = {
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: "1af29e402eee90ab81a5472ad35888933c5d7daaee804b516ce96b3e72a76b68"
            }
        },
        operationName: "MeFollowingLivestreams",
        variables: {
            first: 20, // 20 is the default
            after: null // "-1" is the proper initial value
        }
    };
    // We need to paginate this
    const resultsFollowing = callGQL(MeFollowingLivestreams);

    if (!resultsFollowing.me.private.followeeFeed.list) {
        throw new ScriptException("No initial data found");
    }

    return resultsFollowing.me.private.followeeFeed.list.map((u) => `${URL_CHANNEL}/${u.displayname}`);

    let MeSubscribing = {
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: "18129274ce05949ed82e94fd855132ea8a811c74dae6bd7f279bf1519b41b6c3"
            }
        },
        operationName: "MeSubscribing",
        variables: {
            first: 20, // 20 is the default
            after: null // "-1" is the proper initial value
        }
    };
    const resultsSubscribing = callGQL(MeSubscribing);
    return resultsSubscribing.me.private.subscribing.list.map((u) => `${URL_CHANNEL}/${u.displayname}`);
}

source.getHome = function (continuationToken) {
    /**
     * @AlexisBlade2001: GQL query seems to be broken, I think we have to extract it from the website instead
     * for now, we'll handle this with the query operation... unless it looks broken because of not having a
     * language variable set, if that's the case, I'm dumb for not noticing it
     * @param continuationToken: any?
     * @returns: VideoPager
     */

    let gql = {
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: "4c51ad0b46e3a3b4b0d6abf87445567122ee85d9b257ecbf8eb1cbe4a45aac8e"
            }
        },
        operationName: "HomePageLivestream",
        variables: {
            first: 20, // 20 is the default
            after: continuationToken ?? null, // "-1" is the proper initial value, When i was looking in the website, this almost never matched the value it was supposed to be
            languageID: null, // From GlobalInformation's query - filters homepage with language
            categoryID: null, // ¿? - Filters homepage with category
            order: "TRENDING", // I don't know where the filters are
            showNSFW: false, // This is called X-Tag in the web/app
            showMatureContent: false, // This is called Mature Tag in the web/app - I don't get the differences between this and X-Tags
            userLanguageCode: null // Doesn't seem to affect search, string format is "en", not "es-CL", check GlobalInformation
        }
    };

    const results = callGQL(gql);

    // The results (PlatformVideo)
    const videos = results.data.livestreams.list.map(video =>
        new PlatformVideo({
            id: new PlatformID(PLATFORM, video.id, plugin.config.id),
            name: video.title,
            thumbnails: new Thumbnails([new Thumbnail(video.thumbnailUrl)]),
            author: new PlatformAuthorLink(
                new PlatformID(PLATFORM, video.creator.id, config.id),
                video.creator.displayname,
                `${URL_BASE}/${video.creator.displayname}`,
                video.creator.avatar
                // video.creator.followers.totalCount
            ),
            uploadDate: parseInt(new Date().getTime() / 1000),
            shareUrl: `${URL_BASE}/${video.creator.displayname}`,
            duration: 0,
            viewCount: video.watchingCount,
            url: `${URL_BASE}/${video.creator.displayname}`,
            isLive: true,
        })
    );
    const hasMore = /** data.livestreams.pageInfo.endCursor.hasNextPage ?? */ false; // Are there more pages?
    const context = { continuationToken: results.data.livestreams.pageInfo.endCursor.endCursor }; // Relevant data for the next page

    return new DLiveHomeVideoPager(videos, hasMore, context);
}

source.searchSuggestions = function (query) {
    /**
     * @param query: string
     * @returns: string[]
     */

    return [];
}

source.getSearchCapabilities = function () {
    // This is an example of how to return search capabilities like available sorts,
    // filters and which feed types are available (see source.js for more details) 

    return {
        types: [Type.Feed.Mixed],
        sorts: [Type.Order.Chronological, ""]
        /** I'll try implementing them later
        filters: [
            {
                    id: "date",
                    name: "Date",
                    isMultiSelect: false,
                    filters: [
                        { id: Type.Date.Today, name: "Last 24 hours", value: "today" },
                        { id: Type.Date.LastWeek, name: "Last week", value: "thisweek" },
                        { id: Type.Date.LastMonth, name: "Last month", value: "thismonth" },
                        { id: Type.Date.LastYear, name: "Last year", value: "thisyear" }
                    ]
                },
            ]
        */
    };
}

source.search = function (query, type, order, filters) {
    return new ContentPager([], false);
    /**
     * @param query: string
     * @param type: string
     * @param order: string
     * @param filters: Map<string, Array<string>>
     * @returns: VideoPager
     */

    const videos = []; // The results (PlatformVideo)
    const hasMore = false; // Are there more pages?
    const context = { query: query, type: type, order: order, filters: filters }; // Relevant data for the next page

    return new SomeSearchVideoPager(videos, hasMore, context);
}

source.getSearchChannelContentsCapabilities = function () {
    return {
        types: [Type.Feed.Mixed],
        sorts: [Type.Order.Chronological],
        filters: []
    };
}

source.searchChannelContents = function (url, query, type, order, filters, continuationToken) {
    throw new ScriptImplementationException("Content Searching on Channel not yet implemented");
    /**
     * @param url: string
     * @param query: string
     * @param type: string
     * @param order: string
     * @param filters: Map<string, Array<string>>
     * @param continuationToken: any?
     * @returns: VideoPager
     */

    const videos = []; // The results (PlatformVideo)
    const hasMore = false; // Are there more pages?
    const context = { channelUrl: channelUrl, query: query, type: type, order: order, filters: filters, continuationToken: continuationToken }; // Relevant data for the next page

    return new SomeSearchChannelVideoPager(videos, hasMore, context);
}

source.searchChannels = function (query, continuationToken) {
    /**
     * @param query: string
     * @param continuationToken: any?
     * @returns: ChannelPager
     */

    let gql = {
        operationName: "NavSearchResult",
        variables: {
            text: query,
            userFirst: 8, // 8 is the default on DLive's website
            userAfter: null, // "-1" is the proper default
            categoryFirst: 0
        },
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: "7e32812db61507392d4b6750bb6fc65cd2ec5cc3c89ffc46036296361f943d5d"
            }
        }
    }

    const results = callGQL(gql);

    // The results (PlatformChannel)
    const channels = results.data.search.allUsers.list.map(channel =>
        new PlatformChannel({
            id: new PlatformID(PLATFORM, channel.id ?? channel.creator.id, config.id),
            name: channel.displayname ?? channel.creator.displayname,
            thumbnail: channel.avatar ?? channel.creator.avatar,
            subscribers: channel.followers?.totalCount ?? channel.creator?.followers?.totalCount ?? 0,
            url: `${URL_CHANNEL}/${channel.displayname ?? channel.creator.displayname}`,
            urlAlternatives: [`${URL_BASE}/${channel.displayname ?? channel.creator.displayname}`, `${URL_CHANNEL}/${channel.displayname ?? channel.creator.displayname}`],
        })
    );
    const hasMore = false; // Are there more pages?
    const context = { query: query, continuationToken: continuationToken }; // Relevant data for the next page

    return new DLiveChannelPager(channels, hasMore, context);
}

//Channel
source.isChannelUrl = function (url) {
    /**
     * @param url: string
     * @returns: boolean
     */

    return REGEX_USER.test(url) || REGEX_USER_OLD.test(url) || REGEX_CHANNEL_USER.test(url) || REGEX_CHANNEL_USER_OLD.test(url);
}

source.getChannel = function (url) {
    let gql = {
        operationName: "LivestreamPage",
        variables: {
            displayname: url.split('/').pop(),
            add: false,  // I don't know the purpose of the variable
            isLoggedIn: false,
            isMe: false,  // Show's some extra data from the logged in user
            order: "PickTime",  // I don't know the purpose of the variable
            showUnpicked: false  // I don't know the purpose of the variable
        },
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: "2e6216b014c465c64e5796482a3078c7ec7fbc2742d93b072c03f523dbcf71e2"
            }
        }
    };

    const results = callGQL(gql);

    const channel = results.data.userByDisplayName;

    return new PlatformChannel({
        id: new PlatformID(PLATFORM, channel.id, config.id),
        name: channel.displayname,
        thumbnail: channel.avatar,
        // banner: channel.banner_image?.url,
        subscribers: channel.followers.totalCount,
        // description: channel.user.bio,
        url: `${URL_CHANNEL}/${channel.displayname}`,
        urlAlternatives: [`${URL_BASE}/${channel.displayname}`, `${URL_CHANNEL}/${channel.displayname}`],
    });
}

source.getChannelContents = function (url, type, order, filters, continuationToken) {
    /**
     * @param url: string
     * @param type: string
     * @param order: string
     * @param filters: Map<string, Array<string>>
     * @param continuationToken: any?
     * @returns: VideoPager
     */

    const live = getLiveChannelContent(url) || [];; // The results (PlatformVideo)
    const replays = getReplayChannelContent(url) || [];; // The results (PlatformVideo)
    const videos = getVideoChannelContent(url) || [];; // The results (PlatformVideo)

    /**
     * It should be a Individual Pager for their own type of content
     * except for the livestream content... thing is, i dont understand how to pass those  
     */

    const results = [...live, ...replays, ...videos];
    const hasMore = false; // Are there more pages?

    return new DLiveChannelVideoPager(results, hasMore);
}

source.isContentDetailsUrl = function (url) {
    /**
     * @param url: string
     * @returns: boolean
     */

    return REGEX_USER.test(url) || REGEX_USER_OLD.test(url) || REGEX_VIDEO.test(url) || REGEX_VOD.test(url) || REGEX_CLIP.test(url);
}

source.getContentDetails = function (url) {
    /**
     * @param url: string
     * @returns: PlatformVideoDetails
     */

    if (url.includes('/v/')) {
        return getVideoDetails(url);
    } else if (url.includes('/p/')) {
        return getReplayDetails(url);
    } else if (url.includes('/clip/')) {
        return getClipDetails(url);
    } else {
        return getLiveDetails(url);
    }
}

source.getComments = function (url, continuationToken) {
    /**
     * @param url: string
     * @param continuationToken: any?
     * @returns: CommentPager
     */

    // Verify Content URL
    if (!url.includes('/v/') && !url.includes('/p/')) {
        return new DLiveCommentPager([], false, {});
    }

    let gql = {
        operationName: "ReplyComments",
        variables: {
            permlink: url.split('/').pop(),
            first: 20, // 20 is the default
            after: continuationToken ?? null
        },
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: "b77aa980fe22c7fe3dbb71cc0131eb077fab62dc2c5d0d74b1f9a07a766c1243"
            }
        },
        query: "query ReplyComments($permlink: String!, $first: Int, $after: String) {\n  comments(permlink: $permlink, first: $first, after: $after) {\n    ...VVideoPBCommentFrag\n    __typename\n  }\n}\n\nfragment VVideoPBCommentFrag on CommentConnection {\n  totalCount\n  pageInfo {\n    endCursor\n    hasNextPage\n    __typename\n  }\n  list {\n    ...VVideoPBCommentItemFrag\n    __typename\n  }\n  __typename\n}\n\nfragment VVideoPBCommentItemFrag on Comment {\n  upvotes\n  downvotes\n  author {\n    displayname\n    avatar\n    __typename\n  }\n  content\n  createdAt\n  myVote\n  commentCount\n  permlink\n  __typename\n}\n"
    }

    const results = callGQL(gql);

    if (!Array.isArray(results.data.comments.list)) {
        return new DLiveCommentPager([], false, {});
    }

    // The results (Comment)
    const comments = results.data.comments.list.map(comment => new PlatformComment({
        contextUrl: url,
        author: new PlatformAuthorLink(
            new PlatformID(PLATFORM, `user:${comment.permlink.split('+')[0]}`, plugin.config.id),
            comment.author.displayname,
            `${URL_CHANNEL}/${comment.author.displayname}`,
            comment.author.avatar
        ),
        message: comment.content,
        rating: new RatingLikesDislikes(comment.upvotes, comment.downvotes),
        date: parseInt(comment.createdAt, 10) / 1000,
        replyCount: comment.commentCount,
        context: { permlink: comment.permlink }
    }));

    const hasMore = results.data.comments.pageInfo.hasNextPage ?? false // Are there more pages?
    const context = { url: url, continuationToken: results.data.comments.pageInfo.endCursor }; // Relevant data for the next page

    return new DLiveCommentPager(comments, hasMore, context);
}

source.getSubComments = function (comment, continuationToken = null) {
    /**
     * @param comment: Comment
     * @returns: DLiveCommentPager
     */

    if (typeof comment === 'string') {
        comment = JSON.parse(comment);
    }

    if (!comment.replyCount || comment.replyCount === 0) {
        return new DLiveSubCommentPager([], false, {});
    }

    const gql = {
        operationName: "ReplyComments",
        variables: {
            permlink: comment.context.permlink,
            first: 20,
            after: continuationToken,
        },
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: "b77aa980fe22c7fe3dbb71cc0131eb077fab62dc2c5d0d74b1f9a07a766c1243",
            },
        },
        query: "query ReplyComments($permlink: String!, $first: Int, $after: String) {\n  comments(permlink: $permlink, first: $first, after: $after) {\n    ...VVideoPBCommentFrag\n    __typename\n  }\n}\n\nfragment VVideoPBCommentFrag on CommentConnection {\n  totalCount\n  pageInfo {\n    endCursor\n    hasNextPage\n    __typename\n  }\n  list {\n    ...VVideoPBCommentItemFrag\n    __typename\n  }\n  __typename\n}\n\nfragment VVideoPBCommentItemFrag on Comment {\n  upvotes\n  downvotes\n  author {\n    displayname\n    avatar\n    __typename\n  }\n  content\n  createdAt\n  myVote\n  commentCount\n  permlink\n  __typename\n}\n",
    };

    const results = callGQL(gql);

    const subComments = results.data.comments.list.map((subComment) => {
        return new PlatformComment({
            contextUrl: comment.contextUrl,
            author: new PlatformAuthorLink(
                new PlatformID(
                    PLATFORM,
                    `user:${subComment.permlink.split("+")[0]}`,
                    plugin.config.id
                ),
                subComment.author.displayname,
                `${URL_CHANNEL}/${subComment.author.displayname}`,
                subComment.author.avatar
            ),
            message: subComment.content,
            rating: new RatingLikesDislikes(subComment.upvotes, subComment.downvotes),
            date: parseInt(subComment.createdAt, 10) / 1000,
            replyCount: subComment.commentCount,
            context: {
                permlink: subComment.permlink
            },
        });
    });

    const hasMore = results.data.comments.pageInfo.hasNextPage ?? false;
    const context = {
        parentComment: comment,
        permlink: comment.context.permlink,
        continuationToken: results.data.comments.pageInfo.endCursor,
        contextUrl: comment.contextUrl
    };

    return new DLiveSubCommentPager(subComments, hasMore, context);
}

//Live Chat
source.getLiveChatWindow = function (url) {
    const user = url.split('/').pop()
    return {
        url: `${URL_LIVE_CHAT}/${user}/chatroom`,
        removeElements: [".application--wrap > div:first-child"],
        removeElementsInterval: [".chatroom-header"]
        /** Is there any way to modify the next style from #router-view > div
         * style="top: 0px; left: 0px; height: calc(-52px + 100vh); margin-top: 52px;"
         * as
         * style="top: 0px; left: 0px;"
         * the top margin and height should be removed */
    };
}

class DLiveCommentPager extends CommentPager {
    constructor(results, hasMore, context) {
        super(results, hasMore, context);
    }

    nextPage() {
        if (!this.hasMore) {
            return new CommentPager([], false);
        }
        return source.getComments(this.context.url, this.context.continuationToken);
    }
}

class DLiveSubCommentPager extends CommentPager {
    constructor(results, hasMore, context) {
        super(results, hasMore, context);
    }

    nextPage() {
        if (!this.hasMore) return new DLiveSubCommentPager([], false, this.context);

        return source.getSubComments(this.context.parentComment, this.context.continuationToken);
    }
}

class DLiveHomeVideoPager extends VideoPager {
    constructor(results, hasMore, context) {
        super(results, hasMore, context);
    }

    nextPage() {
        return source.getHome(this.context.continuationToken);
    }
}

class SomeSearchVideoPager extends VideoPager {
    constructor(results, hasMore, context) {
        super(results, hasMore, context);
    }

    nextPage() {
        return source.search(this.context.query, this.context.type, this.context.order, this.context.filters);
    }
}

class SomeSearchChannelVideoPager extends VideoPager {
    constructor(results, hasMore, context) {
        super(results, hasMore, context);
    }

    nextPage() {
        return source.searchChannelContents(this.context.channelUrl, this.context.query, this.context.type, this.context.order, this.context.filters);
    }
}

class DLiveChannelPager extends ChannelPager {
    constructor(results, hasMore, context) {
        super(results, hasMore, context);
    }

    nextPage() {
        return source.searchChannels(this.context.query, this.context.continuationToken);
    }
}

class DLiveChannelVideoPager extends VideoPager {
    constructor(results, hasMore, context) {
        super(results, hasMore, context);
    }

    nextPage() {
        return source.getChannelContents(this.context.url, this.context.type, this.context.order, this.context.filters, this.context.continuationToken);
    }
}

function getLiveChannelContent(url) {
    let gql = {
        operationName: "LivestreamPage",
        variables: {
            displayname: url.split('/').pop(),
            add: false,
            isLoggedIn: false,
            isMe: false,
            order: "PickTime",
            showUnpicked: false
        },
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: "2e6216b014c465c64e5796482a3078c7ec7fbc2742d93b072c03f523dbcf71e2"
            }
        }
    }

    const results = callGQL(gql);

    if (!results.data.userByDisplayName.livestream) {
        return;
    }

    const md = results.data.userByDisplayName;

    const metadata = [new PlatformVideo({
        id: new PlatformID(PLATFORM, md.livestream.id, config.id),
        name: md.livestream.title,
        thumbnails: new Thumbnails([new Thumbnail(md.livestream.thumbnailUrl)]),
        author: new PlatformAuthorLink(
            new PlatformID(PLATFORM, md.id, config.id),
            md.displayname,
            `${URL_CHANNEL}/${md.displayname}`,
            md.avatar,
            md.followers.totalCount
        ),
        uploadDate: parseInt(new Date().getTime() / 1000),
        viewCount: parseFloat(md.livestream.watchingCount),
        url: url,
        isLive: true,
    })];

    return metadata;
}

function getReplayChannelContent(url) {
    let gql = {
        operationName: "LivestreamProfileReplay",
        variables: {
            first: 20,
            displayname: url.split('/').pop()
        },
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: "d8c959e17f50e9ddf145b9797dfcb02e4b6138422dc554d40826b7740e0d494d"
            }
        }
    }

    const results = callGQL(gql);

    if (!results.data.userByDisplayName.pastBroadcastsV2.list) {
        return;
    }

    const broadcasts = results.data.userByDisplayName.pastBroadcastsV2.list.map(broadcast =>
        new PlatformVideo({
            id: new PlatformID(PLATFORM, broadcast.permlink, config.id),
            name: broadcast.title,
            thumbnails: new Thumbnails([new Thumbnail(broadcast.thumbnailUrl)]),
            author: new PlatformAuthorLink(
                new PlatformID(PLATFORM, broadcast.creator.id, config.id),
                broadcast.creator.displayname,
                `${URL_CHANNEL}/${broadcast.creator.displayname}`
            ),
            uploadDate: parseInt(broadcast.createdAt, 10) / 1000,
            duration: parseInt(broadcast.length),
            viewCount: parseFloat(broadcast.viewCount),
            url: `${URL_CHANNEL_STREAMS}/${broadcast.permlink}`,
        })
    );
    /** idk how this one works, it is part of a past broadcast, it doesn't exists in LivestreamProfileVideo's operation
     *  "playbackUrl": "https://playback.prd.dlivecdn.com/live/userID/1734356452/vod.m3u8",
     *  "resolution": [{"resolution": "src","url": "https://playback.prd.dlivecdn.com/live/userID/1734356452/src/playback.m3u8"},
     *  ]
     */
    return broadcasts;
}

function getVideoChannelContent(url) {
    let gql = {
        operationName: "LivestreamProfileVideo",
        variables: {
            displayname: url.split('/').pop()
        },
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: "df2b8483dbe1fb13ef47e3cf6af8d230571061d7038625587c7ed066bdbdddd3"
            }
        }
    };

    const results = callGQL(gql);

    if (!results.data.userByDisplayName.videos.list) {
        return;
    }

    const videos = results.data.userByDisplayName.videos.list.map(video =>
        new PlatformVideo({
            id: new PlatformID(PLATFORM, video.permlink, config.id),
            name: video.title,
            thumbnails: new Thumbnails([new Thumbnail(video.thumbnailUrl)]),
            author: new PlatformAuthorLink(
                new PlatformID(PLATFORM, video.creator.id, config.id),
                video.creator.displayname,
                `${URL_CHANNEL}/${video.creator.displayname}`
            ),
            uploadDate: parseInt(video.createdAt, 10) / 1000,
            duration: parseInt(video.length),
            viewCount: parseFloat(video.viewCount),
            url: `${URL_CHANNEL_VIDEOS}/${video.permlink}`,
        })
    );

    return videos;
}

function getLiveDetails(url) {
    let gql = {
        operationName: "LivestreamPage",
        variables: {
            displayname: url.split('/').pop(),
            add: false,
            isLoggedIn: false,
            isMe: false,
            showUnpicked: false,
            order: "PickTime"
        },
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: "2e6216b014c465c64e5796482a3078c7ec7fbc2742d93b072c03f523dbcf71e2"
            }
        }
    }
    const results = callGQL(gql);

    const md = results.data.userByDisplayName;

    return new PlatformVideoDetails({
        id: new PlatformID(PLATFORM, md.livestream.id, config.id),
        name: md.livestream.title,
        thumbnails: new Thumbnails([new Thumbnail(md.livestream.thumbnailUrl)]),
        author: new PlatformAuthorLink(
            new PlatformID(PLATFORM, md.id, config.id),
            md.displayname,
            `${URL_CHANNEL}/${md.displayname}`,
            md.avatar,
            md.followers.totalCount
        ),
        uploadDate: parseInt(new Date().getTime() / 1000),
        url: url,
        shareUrl: url,
        isLive: true,
        duration: parseInt(md.livestream.length),
        viewCount: parseFloat(md.livestream.watchingCount),
        description: md.livestream.content,
        /** I haven't been able to fetch the live source, I'm trying to figure it out */
        video: new VideoSourceDescriptor([new HLSSource({ url: `${URL_LIVE_HLS}/${md.username}.m3u8?web=true` })]),
        hls: new HLSSource({ url: `${URL_LIVE_HLS}/${md.username}.m3u8?web=true` }),
    });
}

function getReplayDetails(url) {
    let gql = {
        operationName: "PastBroadcastPage",
        variables: {
            permlink: url.split('/').pop(), // Extracting from the url
            isLoggedIn: false // self-explanatory
        },
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: "7e87892585655973d4a7659b3bc3cbdcbbbc2e2bd0b45367e2d42245ea9a1184"
            }
        },
        query: "query PastBroadcastPage($permlink: String!, $commentsFirst: Int, $topContributionsFirst: Int, $commentsAfter: String, $topContributionsAfter: String, $isLoggedIn: Boolean!) {\n  pastBroadcastV2(permlink: $permlink) {\n    creator {\n      id\n      displayname\n      donateDisabled\n      subscribeDisabled\n      __typename\n    }\n    length\n    content\n    createdAt\n    playbackUrl\n    thumbnailUrl\n    upNext {\n      list {\n        ...VVideoPBUpNextItemFrag\n        __typename\n      }\n      __typename\n    }\n    comments(first: $commentsFirst, after: $commentsAfter) {\n      ...VVideoPBCommentFrag\n      __typename\n    }\n    topContributions(first: $topContributionsFirst, after: $topContributionsAfter) {\n      ...VVideoPBUpNextTopContributorFrag\n      __typename\n    }\n    ...VideoPBHeaderFrag\n    ...VVideoPBInfoFrag\n    __typename\n  }\n}\n\nfragment VVideoPBInfoFrag on VideoPB {\n  category {\n    title\n    imgUrl\n    id\n    __typename\n  }\n  language {\n    id\n    language\n    __typename\n  }\n  content\n  permlink\n  title\n  createdAt\n  creator {\n    id\n    displayname\n    __typename\n  }\n  ...VDonationGiftFrag\n  __typename\n}\n\nfragment VDonationGiftFrag on Post {\n  permlink\n  category {\n    id\n    title\n    __typename\n  }\n  language {\n    id\n    language\n    __typename\n  }\n  creator {\n    id\n    username\n    __typename\n  }\n  __typename\n}\n\nfragment VideoPBHeaderFrag on VideoPB {\n  totalReward\n  viewCount\n  creator {\n    id\n    username\n    displayname\n    about\n    followers {\n      totalCount\n      __typename\n    }\n    ...VDliveAvatarFrag\n    ...VDliveNameFrag\n    ...VFollowFrag\n    ...VSubscriptionFrag\n    __typename\n  }\n  ...VPostInfoShareFrag\n  __typename\n}\n\nfragment VDliveAvatarFrag on User {\n  id\n  avatar\n  effect\n  __typename\n}\n\nfragment VDliveNameFrag on User {\n  id\n  displayname\n  partnerStatus\n  __typename\n}\n\nfragment VFollowFrag on User {\n  id\n  username\n  displayname\n  isFollowing @include(if: $isLoggedIn)\n  isMe @include(if: $isLoggedIn)\n  followers {\n    totalCount\n    __typename\n  }\n  __typename\n}\n\nfragment VSubscriptionFrag on User {\n  id\n  username\n  displayname\n  lastStreamedAt\n  mySubscription @include(if: $isLoggedIn) {\n    isSubscribing\n    nextBillingAt\n    lemonSub\n    subType\n    subscribedAt\n    subStreak\n    lastBilledDate\n    status\n    month\n    subStreakStartedAt\n    __typename\n  }\n  isSubscribing @include(if: $isLoggedIn)\n  ...EmojiFrag\n  canSubscribe\n  isMe @include(if: $isLoggedIn)\n  subSetting {\n    badgeColor\n    badgeText\n    textColor\n    streakTextColor\n    benefits\n    backgroundImage\n    __typename\n  }\n  __typename\n}\n\nfragment EmojiFrag on User {\n  id\n  emoji {\n    ...EmojiGlobalFrag\n    ...EmojiVipFrag\n    __typename\n  }\n  __typename\n}\n\nfragment EmojiGlobalFrag on AllEmojis {\n  global {\n    totalCount\n    list {\n      name\n      username\n      sourceURL\n      mimeType\n      level\n      type\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment EmojiVipFrag on AllEmojis {\n  vip {\n    totalCount\n    list {\n      name\n      username\n      sourceURL\n      mimeType\n      level\n      type\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment VPostInfoShareFrag on Post {\n  permlink\n  title\n  content\n  category {\n    id\n    backendID\n    title\n    __typename\n  }\n  creator {\n    id\n    username\n    displayname\n    __typename\n  }\n  __typename\n}\n\nfragment VVideoPBUpNextItemFrag on VideoPB {\n  creator {\n    id\n    displayname\n    __typename\n  }\n  permlink\n  title\n  totalReward\n  thumbnailUrl\n  length\n  createdAt\n  category {\n    id\n    title\n    __typename\n  }\n  viewCount\n  __typename\n}\n\nfragment VVideoPBCommentFrag on CommentConnection {\n  totalCount\n  pageInfo {\n    endCursor\n    hasNextPage\n    __typename\n  }\n  list {\n    ...VVideoPBCommentItemFrag\n    __typename\n  }\n  __typename\n}\n\nfragment VVideoPBCommentItemFrag on Comment {\n  upvotes\n  downvotes\n  author {\n    displayname\n    avatar\n    __typename\n  }\n  content\n  createdAt\n  myVote\n  commentCount\n  permlink\n  __typename\n}\n\nfragment VVideoPBUpNextTopContributorFrag on ContributionConnection {\n  list {\n    amount\n    contributor {\n      ...VDliveAvatarFrag\n      ...VDliveNameFrag\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n"
    }
    const results = callGQL(gql);

    const md = results.data.pastBroadcastV2;

    return new PlatformVideoDetails({
        id: new PlatformID(PLATFORM, md.permlink, config.id),
        name: md.title,
        thumbnails: new Thumbnails([new Thumbnail(md.thumbnailUrl)]),
        author: new PlatformAuthorLink(
            new PlatformID(PLATFORM, md.creator.id, config.id),
            md.creator.displayname,
            `${URL_CHANNEL}/${md.creator.displayname}`,
            md.creator.avatar,
            md.creator.followers.totalCount
        ),
        uploadDate: parseInt(md.createdAt, 10) / 1000,
        url: url,
        shareUrl: url,
        duration: parseInt(md.length),
        viewCount: parseFloat(md.viewCount),
        description: md.content,
        /** Check getReplayChannelContent()'s last comment for it */
        video: new VideoSourceDescriptor([new HLSSource({ url: md.playbackUrl, container: "application/vnd.apple.mpegurl" })]),
        hls: new HLSSource({ url: md.playbackUrl, container: "application/vnd.apple.mpegurl" })
    });
}

function getVideoDetails(url) {
    let gql = {
        operationName: "VideoPage",
        variables: {
            permlink: url.split('/').pop(),
            isLoggedIn: false
        },
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: "a437ab1221ff46c180c60529efee5881820feb7b5fb744b0341e4412453777f2"
            }
        },
        query: "query VideoPage($permlink: String!, $commentsFirst: Int, $topContributionsFirst: Int, $commentsAfter: String, $topContributionsAfter: String, $isLoggedIn: Boolean!) {\n  video(permlink: $permlink) {\n    ageRestriction\n    creator {\n      id\n      displayname\n      donateDisabled\n      subscribeDisabled\n      __typename\n    }\n    createdAt\n    content\n    thumbnailUrl\n    resolution {\n      resolution\n      url\n      __typename\n    }\n    upNext {\n      list {\n        ...VVideoPBUpNextItemFrag\n        __typename\n      }\n      __typename\n    }\n    comments(first: $commentsFirst, after: $commentsAfter) {\n      ...VVideoPBCommentFrag\n      __typename\n    }\n    topContributions(first: $topContributionsFirst, after: $topContributionsAfter) {\n      ...VVideoPBUpNextTopContributorFrag\n      __typename\n    }\n    ...VideoPBHeaderFrag\n    ...VVideoPBInfoFrag\n    tags\n    __typename\n  }\n}\n\nfragment VVideoPBInfoFrag on VideoPB {\n  category {\n    title\n    imgUrl\n    id\n    __typename\n  }\n  language {\n    id\n    language\n    __typename\n  }\n  content\n  permlink\n  title\n  createdAt\n  creator {\n    id\n    displayname\n    __typename\n  }\n  ...VDonationGiftFrag\n  __typename\n}\n\nfragment VDonationGiftFrag on Post {\n  permlink\n  category {\n    id\n    title\n    __typename\n  }\n  language {\n    id\n    language\n    __typename\n  }\n  creator {\n    id\n    username\n    __typename\n  }\n  __typename\n}\n\nfragment VideoPBHeaderFrag on VideoPB {\n  totalReward\n  viewCount\n  creator {\n    id\n    username\n    displayname\n    about\n    followers {\n      totalCount\n      __typename\n    }\n    ...VDliveAvatarFrag\n    ...VDliveNameFrag\n    ...VFollowFrag\n    ...VSubscriptionFrag\n    __typename\n  }\n  ...VPostInfoShareFrag\n  __typename\n}\n\nfragment VDliveAvatarFrag on User {\n  id\n  avatar\n  effect\n  __typename\n}\n\nfragment VDliveNameFrag on User {\n  id\n  displayname\n  partnerStatus\n  __typename\n}\n\nfragment VFollowFrag on User {\n  id\n  username\n  displayname\n  isFollowing @include(if: $isLoggedIn)\n  isMe @include(if: $isLoggedIn)\n  followers {\n    totalCount\n    __typename\n  }\n  __typename\n}\n\nfragment VSubscriptionFrag on User {\n  id\n  username\n  displayname\n  lastStreamedAt\n  mySubscription @include(if: $isLoggedIn) {\n    isSubscribing\n    nextBillingAt\n    lemonSub\n    subType\n    subscribedAt\n    subStreak\n    lastBilledDate\n    status\n    month\n    subStreakStartedAt\n    __typename\n  }\n  isSubscribing @include(if: $isLoggedIn)\n  ...EmojiFrag\n  canSubscribe\n  isMe @include(if: $isLoggedIn)\n  subSetting {\n    badgeColor\n    badgeText\n    textColor\n    streakTextColor\n    benefits\n    backgroundImage\n    __typename\n  }\n  __typename\n}\n\nfragment EmojiFrag on User {\n  id\n  emoji {\n    ...EmojiGlobalFrag\n    ...EmojiVipFrag\n    __typename\n  }\n  __typename\n}\n\nfragment EmojiGlobalFrag on AllEmojis {\n  global {\n    totalCount\n    list {\n      name\n      username\n      sourceURL\n      mimeType\n      level\n      type\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment EmojiVipFrag on AllEmojis {\n  vip {\n    totalCount\n    list {\n      name\n      username\n      sourceURL\n      mimeType\n      level\n      type\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n\nfragment VPostInfoShareFrag on Post {\n  permlink\n  title\n  content\n  category {\n    id\n    backendID\n    title\n    __typename\n  }\n  creator {\n    id\n    username\n    displayname\n    __typename\n  }\n  __typename\n}\n\nfragment VVideoPBUpNextItemFrag on VideoPB {\n  creator {\n    id\n    displayname\n    __typename\n  }\n  permlink\n  title\n  totalReward\n  thumbnailUrl\n  length\n  createdAt\n  category {\n    id\n    title\n    __typename\n  }\n  viewCount\n  __typename\n}\n\nfragment VVideoPBCommentFrag on CommentConnection {\n  totalCount\n  pageInfo {\n    endCursor\n    hasNextPage\n    __typename\n  }\n  list {\n    ...VVideoPBCommentItemFrag\n    __typename\n  }\n  __typename\n}\n\nfragment VVideoPBCommentItemFrag on Comment {\n  upvotes\n  downvotes\n  author {\n    displayname\n    avatar\n    __typename\n  }\n  content\n  createdAt\n  myVote\n  commentCount\n  permlink\n  __typename\n}\n\nfragment VVideoPBUpNextTopContributorFrag on ContributionConnection {\n  list {\n    amount\n    contributor {\n      ...VDliveAvatarFrag\n      ...VDliveNameFrag\n      __typename\n    }\n    __typename\n  }\n  __typename\n}\n"
    };

    const results = callGQL(gql);

    const md = results.data.video;

    const videoSources = md.resolution.map(x =>
        new VideoUrlSource({
            // width: integer,
            height: parseInt(x.resolution),
            container: "video/mp4", // Container is MIME type?
            // codec: string,
            name: x.resolution,
            duration: md.length,
            // bitrate: integer,
            url: signURL(x.url)
        })
    );
    return new PlatformVideoDetails({
        id: new PlatformID(PLATFORM, md.permlink, config.id),
        name: md.title,
        thumbnails: new Thumbnails([new Thumbnail(md.thumbnailUrl)]),
        author: new PlatformAuthorLink(
            new PlatformID(PLATFORM, md.creator.id, config.id),
            md.creator.displayname,
            `${URL_CHANNEL}/${md.creator.displayname}`,
            md.creator.avatar,
            md.creator.followers.totalCount
        ),
        uploadDate: parseInt(md.createdAt, 10) / 1000,
        url: url,
        shareUrl: url,
        duration: parseInt(md.length),
        viewCount: parseFloat(md.viewCount),
        description: md.content,
        video: new VideoSourceDescriptor(videoSources),
    });
}

function getClipDetails(url) {
    let gql = {
        operationName: "ClipView",
        variables: {
            id: url.split('/').pop(),
            isLoggedIn: false
        },
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: "2a3e20aee33fbacb31baa3101e03d35bbb522d72b0acb664be8de2f5995550ea"
            }
        }
    };

    const results = callGQL(gql);

    const md = results.data?.clip;

    return new PlatformVideoDetails({
        id: new PlatformID(PLATFORM, md.id, config.id),
        name: md.description,
        thumbnails: new Thumbnails([new Thumbnail(md.thumbnailUrl)]),
        author: new PlatformAuthorLink(
            new PlatformID(PLATFORM, md.streamer.id, config.id),
            md.streamer.displayname,
            `${URL_CHANNEL}/${md.streamer.displayname}`,
            md.streamer.avatar,
            md.streamer.followers.totalCount
        ),
        url: url,
        shareUrl: url,
        viewCount: parseFloat(md.views),
        description: `Clipper: ${md.clippedBy.displayname}`,
        video: new VideoSourceDescriptor([new VideoUrlSource({ url: signURL(md.url) })]),
        rating: new RatingLikes({ likes: md.upvotes })
    });
}


//* Internals (Extracted from FUTO's Twitch Script and modified)
/**
 * Posts to GQL_URL with the gql query. Includes relevant headers.
 * @param {Object} gql the gql query object to be stringified and sent
 * @param {boolean} use_authenticated if true, will use the authenticated headers
 * @param {boolean} parse if true, will parse the response as json and check for errors
 * @returns {string | Object} the response body as a string or the parsed json object
 * @throws {ScriptException}

 */
function callGQL(gql, use_authenticated = false, parse = true) {
    const resp = http.POST(
        GQL_URL,
        JSON.stringify(gql),
        {
            Accept: '*/*',
            "Content-Type": "application/json",
            DNT: '1',
            Host: 'graphigo.prd.dlive.tv',
            Origin: 'https://dlive.tv',
            Referer: 'https://dlive.tv/'
        },
        use_authenticated
    );

    if (resp.code !== 200) {
        throw new ScriptException(`GQL returned ${resp.code}: ${resp.body}`);
    }

    if (!parse) return resp.body;

    const json = JSON.parse(resp.body);

    const filterErrors = (errors) => {
        return errors.filter(error => {
            const isLoginError = error.message.toLowerCase().includes("require login");
            const isValidPath = Array.isArray(error.path) &&
                error.path[0] === "userByDisplayName" &&
                [
                    "creator", "entries", "isFollowing", "isMe",
                    "isSubscribing", "myRoomRole", "mySubscription",
                    "pastbroadcast", "private", "rerun", "treasureChest"
                ].includes(error.path[1]);

            return !(isLoginError && isValidPath);
        });
    };

    if (json.errors) {
        const filteredErrors = filterErrors(json.errors);

        if (filteredErrors.length > 0) {
            throw new ScriptException(`GQL returned errors: ${JSON.stringify(filteredErrors)}`);
        }
        delete json.errors;
    }

    if (Array.isArray(json) && json.length > 0) {
        for (const obj of json) {
            if (obj.errors) {
                const filteredErrors = filterErrors(obj.errors);

                if (filteredErrors.length > 0) {
                    throw new ScriptException(`GQL returned errors: ${JSON.stringify(filteredErrors)}`);
                }
                delete obj.errors;
            }
        }
    }
    return json;
}

function signURL(url) {
    let gql = {
        operationName: "GenerateSignURL",
        variables: {
            hash: url.replace(/\+/g, '%2B')
        },
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: "c6cb037b35d34a66573c65f4fb9c0ee81eaa58aaffe26783891ff085320d51c0"
            }
        },
        /** Query is needed to work properly */
        query: "mutation GenerateSignURL($hash: String!) {\n  signURLGenerate(hash: $hash) {\n    url\n    err {\n      code\n      __typename\n    }\n    __typename\n  }\n}\n"
    }
    const results = callGQL(gql);

    return results.data.signURLGenerate.url;
}

log("LOADED");
