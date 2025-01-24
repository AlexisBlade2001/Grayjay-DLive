# DLive Plugin for Grayjay
So... this is a random attempt at making a plugin to add [DLive](https://dlive.tv/) as a source for [Grayjay](https://grayjay.app/)
I don't have any kind of guide for this since I'm new on this kind of work, and the code is possibly a complete mess for other people to read so I'm sorry for that

There's a lot of things to fix and implement, more importantly let the plugin fetch data properly with a paginator

Licensing? I don't know how they work, I'm not going to use the wrong one so this is being uploaded without one, pretty sure I have to fix it

Also the whole thing was made when Grayjay was releasing, I just forgot to upload
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
     - [ ] Banner
     - [x] Followers
     - [ ] Description
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
     - [ ] Rating
     - [ ] Comments
       - [ ] Subcomments
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
     - [ ] Rating
     - [ ] Comments
       - [ ] Subcomments
   - [ ] Clips (Unavailable right now)
 - [ ] Authentication
   - [ ] Import Following
 - [ ] Platform Settings
   - [ ] Hide X-Tagged Content
   - [ ] Hide Mature-Tagged Content
   - [ ] Home Language Selection

## What TO-DO / FIX
- [ ] Fetch both comments and subcomments (on Replays and Uploads)
- [ ] Implement search filters
- [ ] Import following list (can it also be Subscriptions?)
- [ ] Fix Captcha
- [ ] Fix Pagers
- [ ] Fix Authentication
- [ ] Fix Live Chat Webview
- [ ] Fix Livestream VideoSource
- [ ] Fix Video resolution listing
- [ ] Fix Replay resolution listing
and more...