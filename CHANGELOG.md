# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]

## [4.0.0] - 2022-03-16
### Added
- Support for EcmaScript modules (aka ESM)
([#1756](https://github.com/cucumber/common/pull/1756))

### Changed
- "@cucumber/messages": "17.1.1",
"@cucumber/message-streams": "4.0.0",
}
}
```
- `@cucumber/messages`is now a peer dependency. You have to add `@cucumber/messages` in your dependencies:
```diff
{
"dependencies": {

### Deprecated

### Fixed

### Removed

## [3.0.0] - 2021-07-08
### Changed
- Upgrade to messages v17.0.0

## [2.1.0] - 2021-05-30
### Added
- The `NdjsonToMessageStream` constructor accepts an optional function for parsing
a line, which may return null if a line is ignored. This can be used to improve performance
by ignoring certain lines.

## [2.0.0] - 2021-05-17
### Changed
- Upgrade to messages 16.0.0

## [1.0.0] - 2021-03-23

[Unreleased]: https://github.com/cucumber/message-streams/compare/v4.0.0...main
[4.0.0]: https://github.com/cucumber/message-streams/compare/v3.0.0...main
[3.0.0]: https://github.com/cucumber/message-streams/releases/tag/v3.0.0
[2.1.0]: https://github.com/cucumber/message-streams/releases/tag/v2.1.0
[2.0.0]: https://github.com/cucumber/message-streams/releases/tag/v2.0.0
[1.0.0]: https://github.com/cucumber/message-streams/releases/tag/v1.0.0


<!-- Contributors in alphabetical order -->
