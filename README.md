# DLive Plugin for Grayjay
So... this is a random attempt at making a plugin to add [DLive](https://dlive.tv/) as a source for [Grayjay](https://grayjay.app/)
I don't have any kind of guide for this since I'm new on this kind of work, and the code is possibly a complete mess for other people to read so I'm sorry for that

There's a lot of things to fix and implement, more importantly let the plugin fetch data properly with a paginator

Licensing? I guess is MIT, I mean, here's the [Sample Plugin](https://gitlab.futo.org/videostreaming/plugins/sample) repository... yeah, I should have submitted it from the very beginning, I guess...
I wasn't sure about it because I didn't use it at the start of it, but instead I started working on it with an old sample documentation.

Also the whole thing was made when Grayjay was releasing, I just forgot to upload

Edit: There's a Reward system on DLive that comes in a chest, this chest gives lemons (the equivalent of Twitch's Bits system) and every user has one that fills with chat interaction, and the streamer can reward them when they decide to open it... thing is, as a spectator, that chest can only be claimed from their app or the desktop version of their website. I don't think this can be solved through the Webview. Also I need to figure out how to sign the plugin... this also requires a website to host it... should look into it
## Functionality
 - [x] Home
   - [x] Live Homepage
 - [ ] Search
   - [ ] Standard Search
     - [ ] Filters
   - [x] Channel Search
 - [x] Channel
   - [x] Profile Data
     - [x] Name
     - [x] Photo
     - [x] Banner
     - [x] Followers
     - [x] Description
     - [x] URL
   - [ ] Membership
   - [x] Content
     - [ ] Searching
     - [ ] Filtering
     - [x] Listing
       - [x] Livestream
       - [x] Replays (Profile Pic Missing)
       - [x] Uploads (Profile Pic Missing)
       - [ ] Clips (Disabled right now)
 - [ ] Content
   - [ ] Live Streams
     - [x] Title
     - [x] Thumbnail
     - [x] Author
     - [x] Share URL
     - [x] Duration
     - [x] View Count
     - [ ] Video Sources
     - [x] Live Chat / Events
       - [ ] Native Implementation
       - [x] WebView Implementation
   - [x] Replays / VODs
     - [x] Title
     - [x] Thumbnail
     - [x] Author
     - [x] Share URL
     - [x] Duration
     - [x] View Count
     - [x] Video Sources
       - [ ] Quality Options
     - [x] Comments
       - [x] Subcomments
   - [x] Uploads / Videos
     - [x] Title
     - [x] Thumbnail
     - [x] Author
     - [x] Share URL
     - [x] Description
     - [x] Duration
     - [x] View Count
     - [x] Video Sources
       - [x] Quality Options
     - [x] Comments
       - [x] Subcomments
   - [x] Clips
     - [x] Title
     - [x] Thumbnail
     - [x] Author
     - [x] Share URL
     - [x] Description
     - [ ] Duration
     - [x] View Count
     - [x] Video Sources
     - [ ] Comments
     - [x] Rating
 - [ ] Authentication
   - [ ] Import Following
 - [ ] Platform Settings
   - [ ] Hide X-Tagged Content
   - [ ] Hide Mature-Tagged Content
   - [ ] Home Language Selection

## What TO-DO / FIX
- [x] Fetch both comments and subcomments (on Replays and Uploads)
- [ ] Implement search filters
- [ ] Import following list (can it also be Subscriptions?)
- [ ] Fix Captcha
- [ ] Fix Pagers
- [ ] Fix Authentication
- [ ] Fix Live Chat Webview
- [ ] Fix Livestream VideoSource
- [ ] Fix Video resolution listing
- [ ] Fix Replay resolution listing
- and more...