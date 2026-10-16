package com.ollfx.aimlab

import android.app.Activity
import android.os.Bundle
import android.graphics.Color
import android.view.View
import android.view.WindowManager
import android.webkit.WebView
import android.webkit.WebChromeClient

/** Standalone offline top-down tactical aim sandbox. No game process access. */
class MainActivity : Activity() {
    private var arena: WebView? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN or
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        )
        val web = WebView(this)
        arena = web
        web.setBackgroundColor(Color.rgb(9, 15, 22))
        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = false
            allowFileAccess = true
            allowContentAccess = false
            blockNetworkLoads = true
            @Suppress("DEPRECATION")
            allowFileAccessFromFileURLs = false
            @Suppress("DEPRECATION")
            allowUniversalAccessFromFileURLs = false
        }
        web.webChromeClient = WebChromeClient()
        setContentView(web)
        web.loadUrl("file:///android_asset/index.html")
    }

    override fun onDestroy() {
        arena?.apply { stopLoading(); loadUrl("about:blank"); destroy() }
        arena = null
        super.onDestroy()
    }
}
