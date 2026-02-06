+module.exports = {
+    module: {
+        rules: [
+            {
+                test: /\.(css|scss|sass)$/,  // Matches .css, .scss, and .sass files
+                use: [
+                    'style-loader',          // Injects styles into the DOM
+                    'css-loader',            // Enables importing CSS files
+                    {
+                        loader: 'postcss-loader',
+                        options: {
+                            postcssOptions: {
+                                plugins: [
+                                    require('autoprefixer'), // Adds vendor prefixes
+                                    require('cssnano')       // Minifies CSS
+                                ],
+                            },
+                        },
+                    },
+                ],
+            },
+        ],
+    },
+};
