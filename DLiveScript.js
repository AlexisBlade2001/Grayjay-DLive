const HLS_BASE = "https://live.prd.dlive.tv/hls";
const HLS_SIGN = `${HLS_BASE}/sign/url`;
const HLS_LIVE = `${HLS_BASE}/live`;

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

const REGEX_USER = new RegExp("^https?:\\/\\/dlive\\.tv\\/([\\w-]{3,20})(?:[\\/#?]|$)", "i");
const REGEX_USER_OLD = new RegExp("^https?:\\/\\/dlive\\.tv\\/([\\w-]+)\\+([\\w-]+)(?:[\\/#?]|$)", "i");
const REGEX_CHANNEL_USER = new RegExp("^https?:\\/\\/dlive\\.tv\\/u\\/([\\w-]{3,20})(?:[\\/#?]|$)", "i");
const REGEX_CHANNEL_USER_OLD = new RegExp("^https?:\\/\\/dlive\\.tv\\/u\\/([\\w-]+)\\+([\\w-]+)(?:[\\/#?]|$)", "i");
const REGEX_VOD = new RegExp("^https?:\\/\\/dlive\\.tv\\/p\\/([\\w-]+\\+[\\w-]+)(?:[\\/#?]|$)", "i");
const REGEX_VIDEO = new RegExp("^https?:\\/\\/dlive\\.tv\\/v\\/([\\w-]+\\+[\\w-]+)(?:[\\/#?]|$)", "i");
const REGEX_CLIP = new RegExp("^https?:\\/\\/dlive\\.tv\\/clip\\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})(?:[\\/#?]|$)", "i");

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

    const isClip = REGEX_CLIP.test(url);
    if (isClip) return false;

    const channelPatterns = [
        REGEX_USER,
        REGEX_USER_OLD,
        REGEX_CHANNEL_USER,
        REGEX_CHANNEL_USER_OLD
    ];

    return channelPatterns.some(pattern => pattern.test(url));
}

source.getChannel = function (url) {
    const displayname = getChannelDisplayName(url);

    let gql = {
        operationName: "UserInfo",
        variables: {
            displayname: displayname
        },
        query: "query UserInfo( $displayname: String! ) { userByDisplayName( displayname: $displayname ) { id username displayname avatar offlineImage subSetting { backgroundImage } followers { totalCount } about panels { title body imageURL imageLinkURL } } }",
    }

    const results = callGQL(gql);

    const channel = results.data.userByDisplayName;

    return new PlatformChannel({
        id: new PlatformID(PLATFORM, channel.id, config.id),
        name: channel.displayname,
        thumbnail: channel.avatar,
        banner: channel.subSetting?.backgroundImage
            ? channel.subSetting.backgroundImage
            : channel.offlineImage !== "https://images.prd.dlivecdn.com/offlineimage/video-placeholder.png"
                ? channel.offlineImage
                : null,
        subscribers: channel.followers?.totalCount,
        description: channel.about, // This is deprecated, some channels have it, Use panels instead? 
        url: `${URL_CHANNEL}/${channel.displayname}`,
        urlAlternatives: [`${URL_BASE}/${channel.displayname}`, `${URL_CHANNEL}/${channel.displayname}`],
    });
}

source.getChannelContents = function (url, type, order, filters, continuationToken = null) {
    /**
     * @param url: string
     * @param type: string
     * @param order: string
     * @param filters: Map<string, Array<string>>
     * @param continuationToken: any?
     * @returns: VideoPager
     */
    const displayname = getChannelDisplayName(url);

    let live = [];
    let replays = [];
    let videos = [];

    let token = continuationToken || {
        isLiveFetched: false,
        displayname: displayname,
        replayAfter: null,
        videoAfter: null,
        replayHasMore: true,
        videoHasMore: true
    };

    if (!token.isLiveFetched) {
        live = getLiveChannelContent(displayname) || [];
        token.isLiveFetched = true;
    }

    if (token.replayHasMore) {
        const replayResult = getReplayChannelContent(displayname, token.replayAfter);
        replays = replayResult.content || [];
        token.replayAfter = replayResult.after;
        token.replayHasMore = replayResult.hasMore;
    }

    if (token.videoHasMore) {
        const videoResult = getVideoChannelContent(displayname, token.videoAfter);
        videos = videoResult.content || [];
        token.videoAfter = videoResult.after;
        token.videoHasMore = videoResult.hasMore;
    }

    const results = [...live, ...replays, ...videos]; // The results (PlatformVideo)
    const hasMore = token.replayHasMore || token.videoHasMore; // Are there more pages?
    const context = {url: url, type: type, order: order, filters: filters, continuationToken: token}; // Relevant data for the next page

    return new DLiveChannelVideoPager(results, hasMore, context);
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
    const displayname = getChannelDisplayName(url)
    return {
        url: `${URL_LIVE_CHAT}/${displayname}/chatroom`,
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

function getLiveChannelContent(displayname) {
    let gql = {
        operationName: "LiveQuery",
        variables: {
            displayname: displayname
        },
        query: "query LiveQuery($displayname: String!) { userByDisplayName(displayname: $displayname) { id displayname username avatar followers { totalCount } livestream { id title thumbnailUrl createdAt permlink watchingCount } } }",
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
        url: `${URL_BASE}/${md.displayname}`,
        isLive: true,
    })];

    return metadata || [];
}

function getReplayChannelContent(displayname, continuationToken) {
    let gql = {
        operationName: "ReplayQuery",
        variables: {
            displayname: displayname,
            first: 10,
            after: continuationToken || null
        },
        query: "query ReplayQuery($displayname: String!, $after: String, $first: Int) { userByDisplayName(displayname: $displayname) { id displayname username avatar followers { totalCount } pastBroadcastsV2(first: $first, after: $after) { pageInfo { ...PageInfoFragment } list { ...ReplayFragment } } } } fragment PageInfoFragment on PageInfo { endCursor hasNextPage } fragment ReplayFragment on PastBroadcast { id title thumbnailUrl createdAt permlink length viewCount }",
    }

    const results = callGQL(gql);

    if (!results.data.userByDisplayName.pastBroadcastsV2.list) {
        return;
    }

    const creator = results.data?.userByDisplayName

    const replays = creator.pastBroadcastsV2?.list.map(replay =>
        new PlatformVideo({
            id: new PlatformID(PLATFORM, replay.id, config.id),
            name: replay.title,
            thumbnails: new Thumbnails([new Thumbnail(replay.thumbnailUrl)]),
            author: new PlatformAuthorLink(
                new PlatformID(PLATFORM, creator.id, config.id),
                creator.displayname,
                `${URL_CHANNEL}/${creator.displayname}`,
                creator.avatar,
                creator.followers.totalCount
            ),
            uploadDate: parseInt(replay.createdAt, 10) / 1000,
            url: `${URL_CHANNEL_STREAMS}/${replay.permlink}`,
            duration: parseInt(replay.length),
            viewCount: parseFloat(replay.viewCount),
        })
    );
  
    return {
        content: replays,
        hasMore: results.data.userByDisplayName.pastBroadcastsV2.pageInfo.hasNextPage,
        after: results.data.userByDisplayName.pastBroadcastsV2.pageInfo.endCursor
    };
}

function getVideoChannelContent(displayname, continuationToken) {
    let gql = {
        operationName: "VideoQuery",
        variables: {
            displayname: displayname,
            first: 10,
            after: continuationToken || null
        },
        query: "query VideoQuery( $displayname: String! $sortedBy: VideoSortOrder $first: Int $after: String ) { userByDisplayName(displayname: $displayname) { id displayname username avatar followers { totalCount }  videos(sortedBy: $sortedBy, first: $first, after: $after) { pageInfo {  ...PageInfoFragment } list {  ...VideoFragment } } } } fragment PageInfoFragment on PageInfo { endCursor hasNextPage } fragment VideoFragment on Video { id title thumbnailUrl createdAt permlink length viewCount } ",
    }

    const results = callGQL(gql);

    if (!results.data?.userByDisplayName?.videos?.list) {
        return;
    }

    const creator = results.data?.userByDisplayName

    const videos = creator.videos?.list.map(video =>
        new PlatformVideo({
            id: new PlatformID(PLATFORM, video.id, config.id),
            name: video.title,
            thumbnails: new Thumbnails([new Thumbnail(video.thumbnailUrl)]),
            author: new PlatformAuthorLink(
                new PlatformID(PLATFORM, creator.id, config.id),
                creator.displayname,
                `${URL_CHANNEL}/${creator.displayname}`,
                creator.avatar,
                creator.followers.totalCount
            ),
            uploadDate: parseInt(video.createdAt, 10) / 1000,
            url: `${URL_CHANNEL_VIDEOS}/${video.permlink}`,
            duration: parseInt(video.length),
            viewCount: parseFloat(video.viewCount),
        })
    );

   return {
      content: videos,
      hasMore: results.data.userByDisplayName.videos.pageInfo.hasNextPage,
      after: results.data.userByDisplayName.videos.pageInfo.endCursor
    };
}

function getLiveDetails(url) {
    const displayname = getChannelDisplayName(url);

    let gql = {
        operationName: "LiveDetails",
        variables: {
            displayname: displayname,
        },
        query: "query LiveDetails($displayname: String!) { userByDisplayName(displayname: $displayname) { id displayname username avatar followers { totalCount } livestream { id title thumbnailUrl createdAt permlink watchingCount content encryptedStream ageRestriction earnRestriction category { title } language { id backendID language code } } } }",
    }

    const results = callGQL(gql);

    const md = results.data.userByDisplayName;

    const hlsSources = getLiveStreamUrl(md.username);

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
        url: `${URL_BASE}/${md.displayname}`,

        shareUrl: `${URL_BASE}/${md.displayname}`, // ?ref=username

        viewCount: parseFloat(md.livestream.watchingCount),

        isLive: true,
        description: `${md.livestream.content}`,
        /** I haven't been able to fetch the live source, I'm trying to figure it out */
        video: new VideoSourceDescriptor(hlsSources)
    });
}

function getReplayDetails(url) {
    const match = url.match(REGEX_VOD);
    if (!match) throw new ScriptException("Invalid URL Replay Format");
    const permlink = match[1];

    let gql = {
        operationName: "ReplayDetails",
        variables: {
            permlink: permlink,
        },
        query: "query ReplayDetails($permlink: String!) { pastBroadcastV2(permlink: $permlink) { id title thumbnailUrl creator { id displayname username avatar followers { totalCount } } createdAt permlink length viewCount resolution { resolution url } content ageRestriction category { title } language { id backendID language code } } }",
    }

    const results = callGQL(gql);

    const md = results.data.pastBroadcastV2;

    const videoSources = md.resolution.map(x =>
        new HLSSource({
            name: x.resolution,
            duration: parseInt(md.length),
            url: x.url
        })
    );

    return new PlatformVideoDetails({
        id: new PlatformID(PLATFORM, md.id, config.id),
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
        url: `${URL_CHANNEL_STREAMS}/${md.permlink}`,

        shareUrl: `${URL_CHANNEL_STREAMS}/${md.permlink}`, // ?ref=username

        duration: parseInt(md.length),
        viewCount: parseFloat(md.viewCount),

        video: new VideoSourceDescriptor(videoSources)
    });
}

function getVideoDetails(url) {
    const match = url.match(REGEX_VIDEO);
    if (!match) throw new ScriptException("Invalid URL Video Format");
    const permlink = match[1];

    let gql = {
        operationName: "VideoDetails",
        variables: {
            permlink: permlink,
        },
        query: "query VideoDetails($permlink: String!) { video(permlink: $permlink) { id title thumbnailUrl creator { id displayname username avatar followers { totalCount } } createdAt permlink length viewCount resolution { resolution url } content ageRestriction category { title } language { id backendID language code } } }",
    }

    const results = callGQL(gql);

    const md = results.data.video;

    const videoSources = md.resolution.map(x =>
        new VideoUrlSource({
            // width: integer,
            // codec: string,
            name: x.resolution,
            // bitrate: integer,
            duration: parseInt(md.length),
            url: signURL(x.url)
        })
    );
    return new PlatformVideoDetails({
        id: new PlatformID(PLATFORM, md.id, config.id),
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
        url: `${URL_CHANNEL_VIDEOS}/${md.permlink}`,

        shareUrl: `${URL_CHANNEL_VIDEOS}/${md.permlink}`, // ?ref=username

        duration: parseInt(md.length),
        viewCount: parseFloat(md.viewCount),

        description: md.content,
        video: new VideoSourceDescriptor(videoSources),
    });
}

function getClipDetails(url) {
    const match = url.match(REGEX_CLIP);
    if (!match) throw new ScriptException("Invalid URL Clip Format");
    const clipId = match[1];

    let gql = {
        operationName: "ClipView",
        variables: {
            id: clipId,
        },
        query: "query ClipView( $id: String! ) { clip( id: $id ) { id description thumbnailUrl streamer { id displayname username avatar followers { totalCount } } createdAt startTime endTime views clippedBy { id displayname username avatar followers { totalCount } } category { title } language { id backendID language code } url upvotes } }"
    };

    const results = callGQL(gql);

    const clip = results.data?.clip;

    return new PlatformVideoDetails({
        id: new PlatformID(PLATFORM, clip.id, config.id),
        name: clip.description,
        thumbnails: new Thumbnails([new Thumbnail(clip.thumbnailUrl)]),
        author: new PlatformAuthorLink(
            new PlatformID(PLATFORM, clip.streamer.id, config.id),
            clip.streamer.displayname,
            `${URL_CHANNEL}/${clip.streamer.displayname}`,
            clip.streamer.avatar,
            clip.streamer.followers.totalCount
        ),
        uploadDate: parseInt(clip.createdAt, 10) / 1000,
        url: `${URL_CHANNEL_CLIPS}/${clip.id}`,

        shareUrl: `${URL_CHANNEL_CLIPS}/${clip.id}`, // ?ref=username

        duration: 0,
        viewCount: parseFloat(clip.views),

        description: `Clipped by: ${clip.clippedBy.displayname}`,
        video: new VideoSourceDescriptor([new VideoUrlSource({ url: clip.url })]),

        rating: new RatingLikes(clip.upvotes),
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
            hash: url.replace(/\+/g, "%2B"),
        },
        query: "mutation GenerateSignURL($hash: String!) { signURLGenerate(hash: $hash) { url err { code } } }",
    };
    const results = callGQL(gql);

    return results.data.signURLGenerate.url;
}

function extractIdentifier(url, patterns) {
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            if (pattern === REGEX_USER_OLD || pattern === REGEX_CHANNEL_USER_OLD) {
                return match[2];
            }
            return match[1];
        }
    }
    return null;
}

function getChannelDisplayName(url) {
    const patterns = [REGEX_CHANNEL_USER, REGEX_USER, REGEX_CHANNEL_USER_OLD, REGEX_USER_OLD];
    const displayname = extractIdentifier(url, patterns);
    if (!displayname) throw new ScriptException("Invalid URL Channel Format");
    return displayname;
}

function getLiveStreamUrl(userName) {
    const initialResponse = http.GET(
        `${HLS_LIVE}/${userName}.m3u8?web=true`,
        {
            Accept: '*/*',
            DNT: '1',
            Origin: 'https://dlive.tv',
            Referer: 'https://dlive.tv/',
        }
    );

    if (initialResponse.code !== 200) {
        throw new Error(`Error getting stream (${initialResponse.code}): ${initialResponse.body}`);
    }

    const sources = parseM3u8(initialResponse.body);

    if (sources.length === 0) {
        throw new Error('Stream not found');
    }

    return getQualitySources(sources);
}

function parseM3u8(content) {
    const lines = content.split('\n');
    const sources = [];
    let hsl = {};

    for (const line of lines) {
        if (line.startsWith('#EXT-X-STREAM-INF:')) {
            hsl = line
                .replace('#EXT-X-STREAM-INF:', '')
                .split(',')
                .reduce((acc, pair) => {
                    const [key, value] = pair.split('=');
                    const cleanKey = key.trim().toLowerCase();
                    const cleanValue = value?.replace(/"/g, '') || '';

                    if (cleanKey === 'bandwidth') acc.bandwidth = parseInt(cleanValue);
                    if (cleanKey === 'resolution') {
                        const [width, height] = cleanValue.split('x');
                        acc.width = parseInt(width);
                        acc.height = parseInt(height);
                        acc.resolution = cleanValue
                    }
                    if (cleanKey === 'codecs') acc.codecs = cleanValue;
                    if (cleanKey === 'video') acc.name = cleanValue;

                    return acc;
                }, {});
        }
        else if (line.startsWith('https://')) {
            sources.push({
                ...hsl,
                url: line.trim(),
                name: hsl.name || hsl.resolution || 'Default',
                width: hsl.width,
                height: hsl.height,
                codecs: hsl.codecs,
                bitrate: hsl.bandwidth
            });
            hsl = {};
        }
    }

    return sources.sort((a, b) => b.bitrate - a.bitrate);
}

function getQualitySources(sources) {
    return sources.map(source => {
        try {
            return new HLSSource({
                width: source.width || 0,
                height: source.height || 0,
                codec: source.codecs || '',
                name: source.name,
                bitrate: source.bandwidth || 0,
                url: getSignedPlaylistUrl(source.url)
            });
        } catch (error) {
            console.warn(`Error processing livestream (Source: ${source.name}): ${error.message}`);
            return null;
        }
    }).filter(source => source !== null);
}

function getSignedPlaylistUrl(initialUrl) {
    const signResponse = http.POST(
        HLS_SIGN,
        JSON.stringify({ playlisturi: initialUrl }),
        {
            Accept: '*/*',
            'Content-Type': 'application/json',
            DNT: '1',
            Origin: 'https://dlive.tv',
            Referer: 'https://dlive.tv/'
        }
    );

    if (signResponse.code !== 200) {
        throw new Error(`Error signing livestream: ${signResponse.body}`);
    }

    return signResponse.body;
}

log("LOADED");
