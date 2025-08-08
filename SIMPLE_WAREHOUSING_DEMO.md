# 📊 DATA WAREHOUSING + ETL COMPLETE FLOW

## **From Operational DB → Data Warehouse → Analytics**

```javascript
// 1️⃣ OPERATIONAL DATABASE (Source)
User.find({ isActive: true })           // Raw operational data
StudyRoom.find({ status: 'active' })    // Live transactional data

// DATA WAREHOUSE SCHEMA (Target)
const analyticsSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    userMetrics: {
        totalUsers: { type: Number, default: 0 },
        activeUsers: { type: Number, default: 0 }
    },
    studyRoomMetrics: {
        totalRooms: { type: Number, default: 0 },
        totalMessages: { type: Number, default: 0 }
    }
});
//  ETL PIPELINE (Extract → Transform → Load)
async function runETL() {
    // EXTRACT: Get raw data from operational systems
    const users = await User.find({ isActive: true });
    const rooms = await StudyRoom.find({ status: 'active' });
    // TRANSFORM: Calculate business metrics
    const transformed = {
        date: new Date(),
        userMetrics: {
            totalUsers: users.length,
            activeUsers: users.filter(u => u.analytics.lastActive > yesterday).length
        },
        studyRoomMetrics: {
            totalRooms: rooms.length,
            totalMessages: rooms.reduce((sum, r) => sum + r.analytics.totalMessages, 0)
        }
    };
    // LOAD: Store processed data in warehouse
    await Analytics.create(transformed);
    return transformed;
}

// 4️⃣ BUSINESS INTELLIGENCE (OLAP Queries)
const businessMetrics = await Analytics.aggregate([
    { $group: { 
        _id: null,
        avgDailyUsers: { $avg: '$userMetrics.activeUsers' },
        totalEngagement: { $sum: '$studyRoomMetrics.totalMessages' }
    }}
]);
```

**🏆 Complete Warehousing:** Operational → ETL → Warehouse → BI Analytics ✅
