package com.ollfx.aimtrainer

import android.app.Activity
import android.os.Bundle
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Color
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import kotlin.math.hypot
import kotlin.random.Random

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_FULLSCREEN or
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION)
        setContentView(AimView(this))
    }
}

private class AimView(context: android.content.Context) : View(context) {
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private var targetX = 300f
    private var targetY = 300f
    private var targetR = 42f
    private var hits = 0
    private var shots = 0
    private var streak = 0
    private var bestStreak = 0
    private var startedAt = System.currentTimeMillis()
    private var lastHitAt = startedAt
    private var averageReaction = 0L
    private var reactionCount = 0
    private var difficulty = 1
    private var showHelp = true

    private fun spawnTarget() {
        val margin = 70f
        targetR = when (difficulty) { 1 -> 43f; 2 -> 34f; else -> 27f }
        targetX = margin + Random.nextFloat() * (width.coerceAtLeast(1) - margin * 2).coerceAtLeast(1f)
        targetY = 110f + Random.nextFloat() * (height.coerceAtLeast(1) - 170f).coerceAtLeast(1f)
        lastHitAt = System.currentTimeMillis()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        canvas.drawColor(Color.rgb(17, 21, 30))
        paint.color = Color.rgb(28, 34, 46); paint.strokeWidth = 1f
        var gx = 0f
        while (gx < width) { canvas.drawLine(gx, 0f, gx, height.toFloat(), paint); gx += 48f }
        var gy = 0f
        while (gy < height) { canvas.drawLine(0f, gy, width.toFloat(), gy, paint); gy += 48f }

        paint.style = Paint.Style.FILL
        paint.color = Color.rgb(255, 75, 93); canvas.drawCircle(targetX, targetY, targetR, paint)
        paint.color = Color.WHITE; canvas.drawCircle(targetX, targetY, targetR * .68f, paint)
        paint.color = Color.rgb(255, 75, 93); canvas.drawCircle(targetX, targetY, targetR * .36f, paint)
        paint.color = Color.WHITE; canvas.drawCircle(targetX, targetY, targetR * .12f, paint)

        paint.color = Color.WHITE; paint.textSize = 25f; paint.typeface = android.graphics.Typeface.create("sans-serif-medium", android.graphics.Typeface.BOLD)
        canvas.drawText("OLL AIM TRAINER", 24f, 38f, paint)
        paint.textSize = 18f; paint.typeface = android.graphics.Typeface.create("sans-serif", android.graphics.Typeface.NORMAL)
        canvas.drawText("HITS  $hits", 24f, 68f, paint)
        canvas.drawText("SHOTS  $shots", 130f, 68f, paint)
        val accuracy = if (shots == 0) 0 else (hits * 100 / shots)
        canvas.drawText("ACCURACY  $accuracy%", 270f, 68f, paint)
        canvas.drawText("STREAK  $streak  (BEST $bestStreak)", 445f, 68f, paint)
        val elapsed = ((System.currentTimeMillis() - startedAt) / 1000).toInt()
        canvas.drawText("TIME  ${elapsed / 60}:${(elapsed % 60).toString().padStart(2, '0')}", width - 145f, 38f, paint)
        paint.color = Color.rgb(160, 177, 201); paint.textSize = 15f
        canvas.drawText("MODE ${listOf("EASY", "MEDIUM", "HARD")[difficulty - 1]}  •  tap target to score  •  tap empty space = miss", 24f, height - 22f, paint)
        if (showHelp) {
            paint.color = Color.argb(225, 8, 12, 20); canvas.drawRoundRect(width / 2f - 190f, height / 2f - 70f, width / 2f + 190f, height / 2f + 70f, 18f, 18f, paint)
            paint.color = Color.WHITE; paint.textSize = 23f
            canvas.drawText("TAP TO START", width / 2f - 83f, height / 2f - 12f, paint)
            paint.textSize = 16f; paint.color = Color.rgb(180, 195, 215)
            canvas.drawText("Practice only — no game interaction", width / 2f - 132f, height / 2f + 20f, paint)
        }
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        if (event.action != MotionEvent.ACTION_DOWN) return true
        val x = event.x; val y = event.y
        if (showHelp) { showHelp = false; startedAt = System.currentTimeMillis(); spawnTarget(); invalidate(); return true }
        if (y < 90f && x > width - 190f) { difficulty = difficulty % 3 + 1; spawnTarget(); invalidate(); return true }
        shots++
        val distance = hypot(x - targetX, y - targetY)
        if (distance <= targetR) {
            hits++; streak++; bestStreak = maxOf(bestStreak, streak)
            val reaction = (System.currentTimeMillis() - lastHitAt).coerceAtLeast(0)
            averageReaction += reaction; reactionCount++
            spawnTarget()
        } else { streak = 0 }
        invalidate()
        return true
    }
}
