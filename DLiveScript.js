const URL_LIVE = "https://live.prd.dlive.tv";
const URL_LIVE_HLS = `${URL_LIVE}/hls/live`;

const GQL_URL = "https://graphigo.prd.dlive.tv";

const URL_BASE = "https://dlive.tv";
const URL_BASE_M = `${URL_BASE}/m`;
const URL_HOME_M = `${URL_BASE_M}/home`;

const URL_CHANNEL = `${URL_BASE}/u`;
const URL_CHANNEL_VIDEOS = `${URL_BASE}/v`;
const URL_CHANNEL_STREAMS = `${URL_BASE}/p`;
const URL_SEARCH_MOBILE = `${URL_BASE_M}/search`;
const URL_BROWSE = `${URL_BASE}/s/browse`;
const URL_LIVE_CHAT = `${URL_BASE}/c`;
const URL_FOLLOWING = `${URL_BASE}/s/following`;
const URL_SUBSCRIPTIONS = `${URL_BASE}/s/mysubscriptions`;

const PLATFORM = "DLive";

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
            after: null
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
            after: null
        }
    };
    const resultsSubscribing = callGQL(MeSubscribing);
    return resultsSubscribing.me.private.subscribing.list.map((u) => `${URL_CHANNEL}/${u.displayname}`);
}

source.getHome = function () {
    /**
     * @returns: VideoPager
     */

    const videos = getHomeResults(); // The results (PlatformVideo)
    const hasMore = false; // Are there more pages?
    // const context = { pageSize: 20 }; // Relevant data for the next page
    return new DLiveHomeVideoPager(videos, hasMore);
    //return new DLiveHomeVideoPager(videos, hasMore, context);
}

source.searchSuggestions = function (query) {
    /**
     * @param query: string
     * @returns: string[]
     */

    // It doesn't seem to make suggestions while searching

    const suggestions = []; //The suggestions for a specific search query
    return suggestions;
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

source.search = function (query, type, order, filters, continuationToken) {
    return new ContentPager([], false);
    /**
     * @param query: string
     * @param type: string
     * @param order: string
     * @param filters: Map<string, Array<string>>
     * @param continuationToken: any?
     * @returns: VideoPager
     */

    const videos = []; // The results (PlatformVideo)
    const hasMore = false; // Are there more pages?
    const context = { query: query, type: type, order: order, filters: filters, continuationToken: continuationToken }; // Relevant data for the next page
    return new SomeSearchVideoPager(videos, hasMore, context);
}

source.getSearchChannelContentsCapabilities = function () {
    //This is an example of how to return search capabilities on a channel like available sorts, filters and which feed types are available (see source.js for more details)
    return {
        types: [Type.Feed.Mixed],
        sorts: [Type.Order.Chronological]
        /** I'll try implementing them later
        filters: []
         */
    };
}

source.searchChannelContents = function (url, query, type, order, filters, continuationToken) {
    throw new ScriptException("This is a sample");
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
     * @returns: ChannelPager
     */

    const channels = getSearchChannelsResults(query); // The results (PlatformChannel)
    const hasMore = false; // Are there more pages?
    return new DLiveChannelPager(channels, hasMore, query);
}

//Channel
source.isChannelUrl = function (url) {
    /**
     * @param url: string
     * @returns: boolean
     */

    return /dlive\.tv\/[a-zA-Z0-9-_]+\/?/.test(url) || /dlive\.tv\/[a-zA-Z0-9-_]+\+[a-zA-Z0-9-_]+\/?/.test(url) || /dlive\.tv\/u\/[a-zA-Z0-9-_]+\/?/.test(url) || /dlive\.tv\/u\/[a-zA-Z0-9-_]+\+[a-zA-Z0-9-_]+\/?/.test(url);
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
        url: `${URL_BASE}/${channel.displayname}`,
        // urlAlternatives: ,
    });
}

source.getChannelContents = function (url) {
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

    /** It should be a Individual Pager for their own type of content
     * except for the livestream content... thing is, i dont understand how to pass their  
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

    return /dlive\.tv\/[a-zA-Z0-9-_]+\/?/.test(url) || /dlive\.tv\/[a-zA-Z0-9-_]+\+[a-zA-Z0-9-_]+\/?/.test(url) || /dlive\.tv\/v\[a-zA-Z0-9-_]+\+[a-zA-Z0-9-_]+\/?/.test(url) || /dlive\.tv\/p\[a-zA-Z0-9-_]+\+[a-zA-Z0-9-_]+\/?/.test(url);
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
    } else if (!url.includes('/p/' || '/v/')) {
        return getLiveDetails(url);
    } else {
        throw new ScriptException("Something went wrong?");
    }
}

source.getComments = function (url) {
    throw new ScriptException("This is a sample");
    /**
     * @param url: string
     * @param continuationToken: any?
     * @returns: CommentPager
     */

    const comments = []; // The results (Comment)
    if (url.includes('/v/')) {
        return getVideoComments(url);
    } else if (url.includes('/p/')) {
        return getReplayComments(url);
    }
    const hasMore = false; // Are there more pages?
    const context = { url: url, }; // Relevant data for the next page
    return new SomeCommentPager(comments, hasMore, context);

}
source.getSubComments = function (comment) {
    throw new ScriptException("This is a sample");
    /**
     * @param comment: Comment
     * @returns: DLiveCommentPager
     */

    if (typeof comment === 'string') {
        comment = JSON.parse(comment);
    }

    return getCommentsPager(comment.context.claimId, comment.context.claimId, 1, false, comment.context.commentId);
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
        return source.getComments(this.context.url, this.context.continuationToken);
    }
}

class DLiveHomeVideoPager extends VideoPager {
    // constructor(results, hasMore, context) {
    //     super(results, hasMore, context);
    // }
    constructor(results, hasMore) {
        super(results, hasMore);
        this.page = 0;
    }

    nextPage() {
        this.page++;
        this.results = getHomeResults(this.page);
        this.hasMore = true;
        return this;
    }
}

class SomeSearchVideoPager extends VideoPager {
    constructor(results, hasMore, context) {
        super(results, hasMore, context);
    }

    nextPage() {
        return source.search(this.context.query, this.context.type, this.context.order, this.context.filters, this.context.continuationToken);
    }
}

class SomeSearchChannelVideoPager extends VideoPager {
    constructor(results, hasMore, context) {
        super(results, hasMore, context);
    }

    nextPage() {
        return source.searchChannelContents(this.context.channelUrl, this.context.query, this.context.type, this.context.order, this.context.filters, this.context.continuationToken);
    }
}

class DLiveChannelPager extends ChannelPager {
    constructor(results, hasMore, query) {
        super(results, hasMore, query);
        this.page = 0;
    }

    nextPage() {
        this.page++;
        this.results = getSearchChannelsResults(query, this.page);
        this.hasMore = false;
        return this;
    }
}

class DLiveChannelVideoPager extends VideoPager {
    constructor(results, hasMore) {
        super(results, hasMore);
        this.page = 0;
    }

    nextPage() {
        return source.getChannelContents(this.context.url);
    }
}

//* Pagers
/**
 * Gets a pager for the home pager
 * @returns {DLiveHomeVideoPager}

 */
function getHomeResults() {
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
            after: null, // When i was looking in the website, this almost never matched the value it was supposed to be 
            languageID: null, // From GlobalInformation's query - filters homepage with language
            categoryID: null, // ¿? - Filters homepage with category
            order: "TRENDING", // I don't know where the filters are
            showNSFW: false, // This is called X-Tag in the web/app
            showMatureContent: false, // This is called Mature Tag in the web/app - I don't get the differences between this and X-Tags
            userLanguageCode: null // Doesn't seem to affect search, string format is "en", not "es-CL", check GlobalInformation
        }
    };

    const results = callGQL(gql);

    const streams = results.data.livestreams.list.map(metadata =>
        new PlatformVideo({
            id: new PlatformID(PLATFORM, metadata.id, config.id),
            name: metadata.title,
            thumbnails: new Thumbnails([new Thumbnail(metadata.thumbnailUrl)]),
            author: new PlatformAuthorLink(
                new PlatformID(PLATFORM, metadata.creator.id, config.id),
                metadata.creator.displayname,
                `${URL_BASE}/${metadata.creator.displayname}`,
                metadata.creator.avatar,
                // metadata.creator.followers.totalCount
            ),
            uploadDate: parseInt(new Date().getTime() / 1000),
            shareUrl: `${URL_BASE}/${metadata.creator.displayname}`,
            duration: 0,
            viewCount: metadata.watchingCount,
            url: `${URL_BASE}/${metadata.creator.displayname}`,
            isLive: true,
        })
    );

    return streams;
}

function getSearchChannelsResults(query) {
    let gql = {
        operationName: "NavSearchResult",
        variables: {
            text: query
        },
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: "7e32812db61507392d4b6750bb6fc65cd2ec5cc3c89ffc46036296361f943d5d"
            }
        }
    }
    // if (context.cursor) gql.variables.cursor = context.cursor

    const results = callGQL(gql);

    const channels = results.data.search.allUsers.list.map(channel =>
        new PlatformChannel({
            id: new PlatformID(PLATFORM, channel.id ?? channel.creator.id, config.id),
            name: channel.displayname ?? channel.creator.displayname,
            thumbnail: channel.avatar ?? channel.creator.avatar,
            subscribers: channel.followers?.totalCount ?? channel.creator?.followers?.totalCount ?? 0,
            url: `${URL_CHANNEL}/${channel.displayname ?? channel.creator.displayname}`,
        })
    );

    return channels;
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


    // if (context.cursor) gql.variables.cursor = context.cursor

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

    // if (context.cursor) gql.variables.cursor = context.cursor

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
            permlink: url.split('/').pop(), // Required
            commentsFirst: null, // Int
            commentsAfter: null, // String
            isLoggedIn: false // Required
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
        video: new VideoSourceDescriptor([new HLSSource({ url: md.playbackUrl })]),
        hls: new HLSSource({ url: md.playbackUrl })
    });
}
function getVideoDetails(url) {
    let gql = {
        operationName: "VideoPage",
        variables: {
            permlink: url.split('/').pop(),
            // commentsFirst: 20,
            // commentsAfter: "0",
            isLoggedIn: false
        },
        extensions: {
            persistedQuery: {
                version: 1,
                sha256Hash: "a437ab1221ff46c180c60529efee5881820feb7b5fb744b0341e4412453777f2"
            }
        },
    };

    const results = callGQL(gql);

    const md = results.data.video;

    const videoSources = md.resolution.map(x =>
        new VideoUrlSource({
            name: x.resolution,
            duration: md.length,
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
        query: "mutation GenerateSignURL($hash: String!) {\n  signURLGenerate(hash: $hash) {\n    url\n    err {\n      code\n      __typename\n    }\n    __typename\n  }\n}\n"
    }
    const results = callGQL(gql);

    return results.data.signURLGenerate.url;
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

    if (json.errors) {
        const filteredErrors = json.errors.filter(error => {
            // Looking for a specific error
            return !(
                error.message === "Require login" &&
                Array.isArray(error.path) &&
                error.path.length === 2 &&
                error.path[0] === "userByDisplayName" &&
                error.path[1] === "isSubscribing"
            );
        });

        if (filteredErrors.length > 0) {
            throw new ScriptException(`GQL returned errors: ${JSON.stringify(filteredErrors)}`);
        }
    }

    if (Array.isArray(json) && json.length > 0) {
        for (const obj of json) {
            if (obj.errors) {
                const filteredErrors = obj.errors.filter(error => {
                    // Looking for a specific error
                    return !(
                        error.message === "Require login" &&
                        Array.isArray(error.path) &&
                        error.path.length === 2 &&
                        error.path[0] === "userByDisplayName" &&
                        error.path[1] === "isSubscribing"
                    );
                });

                if (filteredErrors.length > 0) {
                    throw new ScriptException(`GQL returned errors: ${JSON.stringify(filteredErrors)}`);
                }
            }
        }
    }
    return json;
}

log("LOADED");
