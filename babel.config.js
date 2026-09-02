module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Must be listed last. Required by react-native-reanimated v4.
      'react-native-worklets/plugin',
    ],
  };
};
