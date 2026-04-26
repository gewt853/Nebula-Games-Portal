# Security Specification

## Data Invariants
1. A session must have `lastActive` and `isOnline` fields.
2. `username` is optional but becomes required once set.
3. `gameLocks` and `progressions` are keyed by game ID strings.
4. `game_stats` contains aggregate data (ratingSum, ratingCount) for games.
5. `bans` contains restricted session IDs.

## Dirty Dozen Payloads (Rejection Targets)
1. **Identity Spoofing**: Attempting to write to `sessions/OtherUserID`.
2. **Resource Poisoning**: Writing a 1MB string as a `username`.
3. **Resource Poisoning**: Using a 10KB junk string as a `sessionId`.
4. **State Shortcutting**: Manually setting `ratingSum` to a billion in `game_stats` bypassing the transaction logic.
5. **PII Leak**: Reading `sessions/OtherUserID` (though currently usernames are public, we should restrict sensitive nested fields if any).
6. **Bypass Ban**: Writing to `sessions` after being banned (app side handles this but rules should too).
7. **Invalid Rating**: Submitting a rating of 99 stars.
8. **Invalid Data Type**: Sending an object where a string is expected for `gameLocks` password.
9. **Shadow Field**: Adding `isVerified: true` to a session.
10. **Delete Vandalism**: Deleting `game_stats/SomeGame` as a regular user.
11. **Negative Count**: Setting `ratingCount` to -1.
12. **System Bypass**: Modifying `lastActive` to a date in the future.

## Test Runner (Draft Plan)
- Verify `sessions/{ID}` is only writable by the owner (simulated by checking if ID matches a request property if we had auth, but we use sessionIDs as IDs).
- Verify `game_stats` can only be updated within strict bounds or by system logic (hard in pure rules without Cloud Functions, so we'll secure the surface).
- Verify `bans` is restricted.
