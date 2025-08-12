# Match Links Feature

## Overview

The Pickleball Tournament Management system now includes unique links for every match, allowing spectators and participants to follow individual matches in real-time.

## Features

### 🎯 Unique Match URLs
- Each match has its own dedicated page accessible via: `/tournaments/[tournamentId]/match/[matchId]`
- URLs are automatically generated and unique for each match
- Easy to share and bookmark

### 🔄 Real-Time Updates
- Match results update automatically every 5 seconds
- Live score updates without page refresh
- Real-time team assignments and match status changes

### 📱 Mobile-Friendly
- Responsive design that works on all devices
- Optimized for mobile viewing during tournaments
- Easy sharing via mobile devices

### 🔗 Easy Sharing
- Copy link button for easy sharing
- Web Share API support for native sharing on mobile
- Direct link display for manual copying

## How to Use

### For Tournament Organizers
1. **Create Matches**: Matches are automatically created when setting up the tournament bracket
2. **Assign Teams**: Teams can be assigned to matches through the bracket interface
3. **Update Scores**: Scores can be entered and updated through the match cards
4. **Share Links**: Each match card now includes a "View Match" button

### For Spectators and Participants
1. **Access Match**: Click the "View Match" button on any match card
2. **Follow Live**: The match page automatically updates every 5 seconds
3. **Share**: Use the copy or share buttons to share the match link
4. **Bookmark**: Save the match URL for easy access

### Match Status Indicators
- **Scheduled**: Match is created but teams not yet assigned
- **Live Match**: Teams assigned, match ready to begin
- **In Progress**: Match has started, scores being entered
- **Completed**: Match finished, winner determined

## Technical Details

### API Endpoints
- `GET /api/tournaments/[id]/match/[matchId]` - Fetch match data
- Updates every 5 seconds for real-time experience

### Real-Time Updates
- Client-side polling every 5 seconds
- Automatic data refresh
- Visual indicators for live status

### URL Structure
```
/tournaments/{tournamentId}/match/{matchId}
```

## Benefits

1. **Better Spectator Experience**: Fans can follow specific matches without navigating the entire bracket
2. **Easy Sharing**: Coaches, players, and fans can share match links on social media
3. **Mobile Optimization**: Perfect for mobile viewing during live tournaments
4. **Real-Time Updates**: No need to refresh the page to see score updates
5. **Professional Presentation**: Clean, modern interface for match viewing

## Future Enhancements

- WebSocket support for instant updates
- Push notifications for match start/end
- Social media integration
- Match statistics and analytics
- Player/team profiles
- Tournament brackets with match links
