const fs = require('fs');
const path = require('path');

const targetPath = path.resolve(__dirname, '../node_modules/react-native-css-interop/babel.js');

if (fs.existsSync(targetPath)) {
  const patchedContent = `module.exports = function () {
  const plugins = [
    require("./dist/babel-plugin").default,
    [
      "@babel/plugin-transform-react-jsx",
      {
        runtime: "automatic",
        importSource: "react-native-css-interop",
      },
    ],
  ];

  try {
    require.resolve("react-native-worklets/plugin");
    plugins.push("react-native-worklets/plugin");
  } catch (e) {
    // react-native-worklets is not installed, skip it
  }

  return {
    plugins,
  };
};
`;

  fs.writeFileSync(targetPath, patchedContent, 'utf8');
  console.log('Successfully patched react-native-css-interop/babel.js');
} else {
  console.log('react-native-css-interop/babel.js not found, skipping patch.');
}
