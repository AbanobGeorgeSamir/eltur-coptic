package com.example.project

import android.app.Application
import androidx.work.Configuration
import androidx.work.WorkManager

class MainApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        WorkManager.initialize(this, Configuration.Builder().build())
    }
}
