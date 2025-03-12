
namespace DateTimeClass {

    export class dates { constructor(public month: number, public day: number, public year: number) { } }

    export class times { constructor(public hour: number, public minute: number, public second: number) { } }


    //% blockHidden=true
    //% blockId=datetimeclass_dateshadow
    //% block="month $month / day $day / year $year"
    //% month.min=1 month.max=12 month.defl=1
    //% day.min=1 day.max=31 day.defl=20
    //% year.min=2020 year.max=2050 year.defl=2022
    export function datevalue(month: number, day: number, year: number) { return new dates(month, day, year) }

    //% blockHidden=true
    //% blockId=datetimeclass_timeshadow
    //% block="$hour : $min . $sec"
    //% hour.min=0 hour.max=23 hour.defl=13
    //% min.min=0 min.max=59 min.defl=30
    //% sec.min=0 sec.max=59 sec.defl=0
    export function time24value(hour: number, min: number, sec: number) { return new times(hour, min, sec) }

    //% blockHidden=true
    //% blockId=datetimeclass_halftimeshadow
    //% block="$hour : $min . $sec"
    //% hour.min=1 hour.max=12 hour.defl=11
    //% min.min=0 min.max=59 min.defl=30
    //% sec.min=0 sec.max=59 sec.defl=0
    export function time12value(hour: number, min: number, sec: number) { return new times(hour, min, sec) }


}

/**
 * Provides a software based running clock for the time and date for the arcade. 
 * The makecode arcade doesn't have a true real-time clock. The arcade uses a timer derived from the
 * 16MHz clock, which is crystal based and should have an accuracy near 10 part per million, 
 * or about 0.864 seconds/day.
 *
 * @author Bill Siever
 */
//% block="Time and Date with Class"
//% color="#3452eb"  icon="\uf017"
namespace DateTimeClass {



    // ********* Enumerations for parameter types ************************

    let monthName: string[][] = [
        ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
        ["January", "Febuary", "March", "April", "May", "June", "July", "Orgust", "September", "October", "November", "December"]
    ]

    let weekName: string[][] = [
        ["0", "1", "2", "3", "4", "5", "6"],
        ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    ]

    export enum YearFormat {
        //% block="national year"
        NY = 0,
        //% block="buddhist year"
        BHY = 543,
    }

    export enum OffsetWeek {
        //% block="sunday"
        SUN = 6,
        //% block="saturday"
        SAT = 5,
        //% block="monday"
        MON = 0
    }

    export enum MornNight {
        //% block="am"
        AM,
        //% block="pm"
        PM
    }

    export enum TimeUnit {
        //% block="ms"
        Milliseconds,
        //% block="seconds"
        Seconds,
        //% block="minutes"
        Minutes,
        //% block="hours"
        Hours,
        //% block="days"
        Days
    }

    export enum TimeFormat {
        //% block="h:mm.ss am / pm"
        HMMSSAMPM,
        //% block="hh:mm 24-hr"
        HHMM24hr,
        //% block="hh:mm.ss 24-hr"
        HHMMSS24hr,
        //% block="h:mm"
        HMM,
        //% block="h:mm am / pm"
        HMMAMPM,
    }

    export enum DateFormat {
        //% block=day/subweekname/submonthname"
        DWnsMns,
        //% block="day/weekname/monthname"
        DWnMn,
        //% block="month/day"
        MD,
        //% block="month/day/year"
        MDY,
        //% block="year-month-day"
        YYYY_MM_DD
    }

    export enum MonthNameFormat {
        //% block="Fullname"
        Fname,
        //% block="Subname"
        Sname,
    }

    export enum WeekNameFormat {
        //% block="Fullname"
        Fname,
        //% block="3Subname"
        S3name,
        //% block="2Subname"
        S2name,
    }

    type Month = uint8   // 1-12 Month of year
    type Day = uint8     // 1-31 / Day of month
    type Year = uint16 // Assumed to be 0000-0099 or 2020-2099  
    type Hour = uint8  // 0-23 / 24-hour format  
    type Minute = uint8 // 0-59 
    type Second = uint8 // 0-59
    type DayOfYear = uint16 // 1-366

    type SecondsCount = uint32 // Seconds since start of start year
    type Weekday = uint8 // Weekday code. 0=Sunday, 1=Monday, etc.

    interface DateTime {
        month: Month   // 1-12 Month of year
        day: Day   // 1-31 / Day of month
        year: Year  // Assumed to be 2020 or later
        hour: Hour   // 0-23 / 24-hour format  
        minute: Minute   // 0-59 
        second: Second   // 0-59
        dayOfYear: DayOfYear  // 1-366
    }

    interface Date {
        month: Month   // 1-12 Month of year
        day: Day   // 1-31 / Day of month
        year: Year  // Assumed to be 2020 or later
        dayOfYear: DayOfYear  // 1-366
    }

    interface MonthDay {
        month: Month   // 1-12 Month of year
        day: Day   // 1-31 / Day of month
    }

    // ********* State Variables ************************

    const TIME_AND_DATE_EVENT = 94
    const TIME_AND_DATE_NEWMINUTE = 1
    const TIME_AND_DATE_NEWHOUR = 2
    const TIME_AND_DATE_NEWDAY = 3

    // State variables to manage time 
    let startYear: Year = 0
    let timeToSetpoint: SecondsCount = 0
    let cpuTimeAtSetpoint: SecondsCount = 0

    /*    
    Time is all relative to the "start year" that is set by setDate() (or 0 by default) as follows:

      Start year          Time Date/Time set        CurrentCPUTime
      |                   | (in s)                  | (in s)
      V                   V                         V
      |-------------------+-------------------------|
                          ^
                          |
                          Known dd/mm/yy hh:mm,.s
                          AND cpuTimeAtSetpoint (in s)
       |------------------|-------------------------|
          timeToSetpoint          deltaTime
          (in s)                  ( in s)
    
        setDate sets the startYear and updates timeToSetpoint and cpuTimeAtSetpoint 
        setTime methods update just timeToSetpoint and cpuTimeAtSetpoint
     */

    // State for event handlers 
    let lastUpdateMinute: Minute = 100   // Set to invalid values for first update
    let lastUpdateHour: Hour = 100
    let lastUpdateDay: Day = 100


    // Cummulative Days of Year (cdoy): Table of month (1-based indices) to cummulative completed days prior to month
    // Ex: By Feb 1st (2nd month / index 2), 31 days of Jan are completed. 
    const cdoy: DayOfYear[] = [0, 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365]

    // ********* Time Calculation / Management ************************
    export class DatetimeObject {
        public myDatetime: DateTime; public myDate: Date
        public startYear: Year; public timeToSetpoint: SecondsCount; public cpuTimeAtSetpoint: SecondsCount
        public lastUpdateMinute: Minute;public lastUpdateHour: Hour; public lastUpdateDay: Day
        public TIME_AND_DATE_EVENT: number; public TIME_AND_DATE_NEWMINUTE: number; public TIME_AND_DATE_NEWHOUR: number; public TIME_AND_DATE_NEWDAY: number

        constructor() {
            this.startYear = 0, this.timeToSetpoint = 0, this.cpuTimeAtSetpoint = 0
            this.lastUpdateMinute = 100, this.lastUpdateHour = 100, this.lastUpdateDay = 100
            this.myDatetime = { month: 0, day: 0, year: 0, hour: 0, minute: 0, second: 0, dayOfYear: 0 }
            this.TIME_AND_DATE_EVENT = 94, this.TIME_AND_DATE_NEWMINUTE = 1, this.TIME_AND_DATE_NEWHOUR = 2, this.TIME_AND_DATE_NEWDAY = 3
            this.run()
        }

        public run() {
        /* 
        This ensures that "time" is checked periodically and event handlers are called.  
        */
        game.onUpdateInterval(864, function () {
            // Only run about every 2 s;  Micro:bit uses a ticker with a 32kHz period, so the count should increase by about 65kHz for arcade or etc.
            const cpuTime = this.cpuTimeInSeconds()
            const t = this.timeFor(cpuTime)
            this.myDatetime = t
            if (this.lastUpdateMinute != t.minute) {
                // New minute
                control.raiseEvent(this.TIME_AND_DATE_EVENT, this.TIME_AND_DATE_NEWMINUTE)
                this.lastUpdateMinute = t.minute
            }
            if (this.lastUpdateHour != t.hour) {
                // New hour
                control.raiseEvent(this.TIME_AND_DATE_EVENT, this.TIME_AND_DATE_NEWHOUR)
                this.lastUpdateHour = t.hour
            }
            if (this.lastUpdateDay != t.day) {
                // New day
                control.raiseEvent(this.TIME_AND_DATE_EVENT, this.TIME_AND_DATE_NEWDAY)
                this.lastUpdateDay = t.day
            }
        })
    }

    public isLeapYear(y: Year): boolean {
        // The /400 and /100 rules don't come into play until 2400 and 2300 or 0100.  We can ignore them here
        // Here's the code for accurate handling of leap years:
        return (y % 400 == 0 || (y % 100 != 0 && y % 4 == 0))

        // Simplified case for 2020-2099.
        // return y % 4 == 0
    }


    // Returns a MonthDay with from a DayOfYear and given Year
    public dayOfYearToMonthAndDay(d: DayOfYear, y: Year): MonthDay {
        // If it's after Feb in a leap year, adjust
        if (this.isLeapYear(y)) {
            if (d == 60) {  // Leap Day!
                return { month: 2, day: 29 }
            } else if (d > 60) {
                d -= 1  // Adjust for leap day
            }
        }
        for (let i = 1; i < cdoy.length; i++) {  // Start at 1 for 1- based index
            // If the day lands in (not through) this month, return it
            if (d <= cdoy[i + 1]) {
                return { month: i, day: d - cdoy[i] }

            }
        }
        // This should never happen!
        return { month: -1, day: -1 }
    }

    public secondsSoFarForYear(m: Month, d: Day, y: Year, hh: Hour, mm: Minute, ss: Second): SecondsCount {
        // ((((Complete Days * 24hrs/ day)+complete hours)*60min/ hr)+complete minutes)* 60s/ min + complete seconds
        // Yay Horner's Rule!:
        return (((this.dateToDayOfYear(datevalue(m, d, y)) - 1) * 24 + hh) * 60 + mm) * 60 + ss
    }

    public dateSinceFor(dateSince: SecondsCount, offsetSince: SecondsCount=0, offsetYear: Year=0): Date {
        // Find elapsed years by counting up from start year and subtracting off complete years
        let startDateCount = dateSince
        if (offsetSince > 0) startDateCount -= offsetSince
        let y = 1
        if (offsetYear > 0) y = offsetYear
        let leap = this.isLeapYear(y)
        while ((!leap && startDateCount > 365) || (startDateCount > 366)) {
            if (leap) {
                startDateCount -= 366
            } else {
                startDateCount -= 365
            }
            y += 1
            leap = this.isLeapYear(y)
        }

        // sSinceStartOfYear and leap are now for "y", not "year".  Don't use "year"! Use "y"
        // Find elapsed days
        const daysFromStartOfYear = Math.constrain(startDateCount, 1, (this.isLeapYear(y)) ? 366 : 365) // +1 offset for 1/1 being day 

        // Convert days to dd/ mm
        const ddmm = this.dayOfYearToMonthAndDay(daysFromStartOfYear, y) // current year, y, not start year

        return { month: ddmm.month, day: ddmm.day, year: y, dayOfYear: daysFromStartOfYear }
    }

    public timeFor(cpuTime: SecondsCount): DateTime {
        const deltaTime = cpuTime - this.cpuTimeAtSetpoint
        let sSinceStartOfYear = this.timeToSetpoint + deltaTime, uSince = sSinceStartOfYear
        // Find elapsed years by counting up from start year and subtracting off complete years
        let y = this.startYear
        let leap = this.isLeapYear(y)
        while ((!leap && sSinceStartOfYear > 365 * 24 * 60 * 60) || (sSinceStartOfYear > 366 * 24 * 60 * 60)) {
            if (leap) {
                sSinceStartOfYear -= 366 * 24 * 60 * 60
            } else {
                sSinceStartOfYear -= 365 * 24 * 60 * 60
            }
            y += 1
            leap = this.isLeapYear(y)
        }

        // sSinceStartOfYear and leap are now for "y", not "year".  Don't use "year"! Use "y"
        // Find elapsed days
        const daysFromStartOfYear = Math.idiv(sSinceStartOfYear, (24 * 60 * 60)) + 1  // +1 offset for 1/1 being day 1
        const secondsSinceStartOfDay = sSinceStartOfYear % (24 * 60 * 60)

        // Find elapsed hours
        const hoursFromStartOfDay = Math.idiv(secondsSinceStartOfDay, (60 * 60))
        const secondsSinceStartOfHour = secondsSinceStartOfDay % (60 * 60)

        // Find elapsed minutes
        const minutesFromStartOfHour = Math.idiv(secondsSinceStartOfHour, (60))
        // Find elapsed seconds
        const secondsSinceStartOfMinute = secondsSinceStartOfHour % (60)

        // Convert days to dd/ mm
        const ddmm = this.dayOfYearToMonthAndDay(daysFromStartOfYear, y) // current year, y, not start year

        return { month: ddmm.month, day: ddmm.day, year: y, hour: hoursFromStartOfDay, minute: minutesFromStartOfHour, second: secondsSinceStartOfMinute, dayOfYear: daysFromStartOfYear }
    }

    public timeSinceFor(timeSince: SecondsCount, offsetSince: SecondsCount=0, offsetYear: Year=0): DateTime {
        let sSinceStartOfYear = timeSince
        if (offsetSince > 0) sSinceStartOfYear -= offsetSince
        // Find elapsed years by counting up from start year and subtracting off complete years
        let y = 1
        if (offsetYear > 0) y = offsetYear
        let leap = this.isLeapYear(y)
        while ((!leap && sSinceStartOfYear > 365 * 24 * 60 * 60) || (sSinceStartOfYear > 366 * 24 * 60 * 60)) {
            if (leap) {
                sSinceStartOfYear -= 366 * 24 * 60 * 60
            } else {
                sSinceStartOfYear -= 365 * 24 * 60 * 60
            }
            y += 1
            leap = this.isLeapYear(y)
        }

        // sSinceStartOfYear and leap are now for "y", not "year".  Don't use "year"! Use "y"
        // Find elapsed days
        const daysFromStartOfYear = Math.idiv(sSinceStartOfYear, (24 * 60 * 60)) + 1  // +1 offset for 1/1 being day 1
        const secondsSinceStartOfDay = sSinceStartOfYear % (24 * 60 * 60)

        // Find elapsed hours
        const hoursFromStartOfDay = Math.idiv(secondsSinceStartOfDay, (60 * 60))
        const secondsSinceStartOfHour = secondsSinceStartOfDay % (60 * 60)

        // Find elapsed minutes
        const minutesFromStartOfHour = Math.idiv(secondsSinceStartOfHour, (60))
        // Find elapsed seconds
        const secondsSinceStartOfMinute = secondsSinceStartOfHour % (60)

        // Convert days to dd/ mm
        const ddmm = this.dayOfYearToMonthAndDay(daysFromStartOfYear, y) // current year, y, not start year

        return { month: ddmm.month, day: ddmm.day, year: y, hour: hoursFromStartOfDay, minute: minutesFromStartOfHour, second: secondsSinceStartOfMinute, dayOfYear: daysFromStartOfYear }
    }

    //% shim=datetimeclass::cpuTimeInSeconds
    public cpuTimeInSeconds(): uint32 {
        return Math.idiv(game.runtime(), 1000)
    }

    // ********* Misc. Utility Functions for formatting ************************
    public leftZeroPadTo(inp: number, digits: number) {
        let value = inp + ""
        while (value.length < digits) {
            value = "0" + value
        }
        return value
    }


    // 24-hour time:  hh:mm.ss
    public fullTime(t: DateTime): string {
        return this.leftZeroPadTo(t.hour, 2) + ":" + this.leftZeroPadTo(t.minute, 2) + "." + this.leftZeroPadTo(t.second, 2)
    }

    // Full year: yyyy-mm-dd
    public fullYear(t: DateTime, y: YearFormat = 0): string {
        return this.leftZeroPadTo(t.year + y, 4) + "-" + this.leftZeroPadTo(t.month, 2) + "-" + this.leftZeroPadTo(t.day, 2)
    }


    // ********* Exposed blocks ************************


    /**
     * Set the time using 24-hour format. 
     * @param time from hour the hour (0-23), minute the minute (0-59), second the second (0-59)
     */
    //% blockid=datetimeclass_set24hrtime
    //% block=" $this set time from 24-hour time $times"
    //% this.shadow=variables_get this.defl=myDateTime
    //% times.shadow=datetimeclass_timeshadow
    //% weight=90
    public set24HourTime(times: times) {
        let hour = times.hour, minute = times.minute, second = times.second
        hour = hour % 24
        minute = minute % 60
        second = second % 60
        const cpuTime = this.cpuTimeInSeconds()
        const t = this.timeFor(cpuTime)
        this.cpuTimeAtSetpoint = cpuTime
        this.timeToSetpoint = this.secondsSoFarForYear(t.month, t.day, t.year, hour, minute, second)
    }

    /**
     * Set the date
     * @param date from month the month 1-12, day the day of the month 1-31, the year 2020-2050
     */
    //% blockid=datetimeclass_setdate
    //% block=" $this set date to $dates"
    //% this.shadow=variables_get this.defl=myDateTime
    //% dates.shadow=datetimeclass_dateshadow
    //% weight=80
    public setDate(dates: dates) {
        let year = dates.year, month = dates.month, day = dates.day
        month = month % 13
        day = day % 32
        const cpuTime = this.cpuTimeInSeconds()
        const t = this.timeFor(cpuTime)
        this.startYear = year
        this.cpuTimeAtSetpoint = cpuTime
        this.timeToSetpoint = this.secondsSoFarForYear(month, day, startYear, t.hour, t.minute, t.second)
    }

    /**
     * Set the time using am/pm format
     * @param time from hour the hour (1-12), minute the minute (0-59), second the second (0-59)
     * @param ampm morning or night
     */
    //% block=datetimeclass_settime
    //% block=" $this set time to $times $ampm"
    //% this.shadow=variables_get this.defl=myDateTime
    //% times.shadow=_halftimeshadow
    //% inlineInputMode=inline
    //% weight=100
    public set12HourTime(times: times, ampm: MornNight) {
        let hour = times.hour, minute = times.minute, second = times.second
        hour = (hour - 1 % 12) + 1
        // Adjust to 24-hour time format
        if (ampm == MornNight.AM && hour == 12) {  // 12am -> 0 hundred hours
            hour = 0;
        } else if (ampm == MornNight.PM && hour != 12) {   // PMs other than 12 get shifted after 12:00 hours
            hour = hour + 12;
        }
        this.set24HourTime(time24value(hour, minute, second));
    }

    /**
     * Advance the time by the given amount, which cause "carries" into other aspects of time/date.  Negative values will cause time to go back by the amount.
     * @param amount the amount of time to add (or subtract if negative).  To avoid "carries" use withTime blocks
     * @param unit the unit of time
     */
    //% blockid=datetimeclass_advancesetdatetime
    //% block=" $this advance time/date by $amount $unit" advanced=true
    //% this.shadow=variables_get this.defl=myDateTime
    //% weight=50
    public advanceBy(amount: number, unit: TimeUnit) {
        const units = [0, 1, 60 * 1, 60 * 60 * 1, 24 * 60 * 60 * 1]
        // Don't let time go negative:
        if (amount < 0 && (-amount * units[unit]) > timeToSetpoint)
            this.timeToSetpoint = 0
        else
            this.timeToSetpoint += amount * units[unit]
    }

    /**
     * get day since from date
     * @param date of month day year
     */
    //% blockid=datetimeclass_datetodaysince
    //% block=" $this day since as $dates"
    //% this.shadow=variables_get this.defl=myDateTime
    //% dates.shadow=datetime_dateshadow
    //% weight=20
    public dateToDaySince(dates: dates): SecondsCount {
        let uyear = dates.year, umonth = dates.month, uday = dates.day
        umonth = Math.constrain(umonth, 1, 12)
        let daySince = 0
        for (let yidx = 1; yidx < uyear; yidx++) daySince += (this.isLeapYear(yidx)) ? 366 : 365;
        daySince += this.dateToDayOfYear(datevalue(umonth, uday, uyear))
        return daySince
    }

    /**
     * get time since from date and time
     * @param date of month day year
     * @param time of hour minute second
     */
    //% blockid=datetimeclass_datetodaysince
    //% block=" $this time since as $dates and $times"
    //% this.shadow=variables_get this.defl=myDateTime
    //% dates.shadow=datetimeclass_dateshadow
    //% times.shadow=datetimeclass_timeshadow
    //% weight=20
    public dateAndTimeToTimeSince(dates: dates, times: times): SecondsCount {
        let uyear = dates.year, umonth = dates.month, uday = dates.day
        let uhour = times.hour, uminute = times.minute, usecond = times.second
        umonth = Math.constrain(umonth, 1, 12)
        let timeSince = 0
        for (let yidx = 1; yidx < uyear; yidx++) timeSince += ((this.isLeapYear(yidx)) ? 366 : 365) * (24 * 60 * 60);
        timeSince += this.dateToDayOfYear(datevalue(umonth, uday, uyear)) * (24 * 60 * 60)
        timeSince += (uhour % 24) * (60 * 60), timeSince += (uminute % 60) * (60), timeSince += (usecond % 60)
        return timeSince
    }

    /**
     * Get the Day of the week  
     * @param 0=>Monday, 1=>Tuesday, etc.
     */
    //% blockid=datetimeclass_date2dayweek
    //% block=" $this day of week for $dates" advanced=true
    //% this.shadow=variables_get this.defl=myDateTime
    //% dates.shadow=datetimeclass_dateshadow
    //% weight=40
    public dateToDayOfWeek(dates: dates): Weekday {
        let month = dates.month, day = dates.day, year = dates.year
        let doy = this.dateToDayOfYear(datevalue(month, day, year))
        // Gauss's Algorithm for Jan 1: https://en.wikipedia.org/wiki/Determination_of_the_day_of_the_week
        // R(1+5R(A-1,4)+4R(A-1,100)+6R(A-1,400),7)    
        let jan1 = ((1 + 5 * ((year - 1) % 4) + 4 * ((year - 1) % 100) + 6 * ((year - 1) % 400)) % 7)
        jan1 += 6  // Shift range:  Gauss used 0=Sunday, we'll use 0=Monday
        return ((doy - 1) + jan1) % 7
    }

    /**
     * Get the Day of the year  
     * @param Jan 1 = 1, Jan 2=2, Dec 31 is 365 or 366
     */
    //% blockid=datetimeclass_date2dayyear
    //% block=" $this day of year for $dates" advanced=true
    //% this.shadow=variables_get this.defl=myDateTime
    //% dates.shadow=datetimeclass_dateshadow
    //% weight=30
    public dateToDayOfYear(dates: dates): DayOfYear {
        let year = dates.year, month = dates.month, day = dates.day
        month = Math.constrain(month, 1, 12)
        // Assumes a valid date
        let dayOfYear = cdoy[month] + day
        // Handle after Feb in leap years:
        if (month > 2 && this.isLeapYear(year)) {
            dayOfYear += 1
        }
        return dayOfYear
    }

    /**
     * calculate my age from birthdate in currentdate
     * @param your birthdate to calculating your age from currentdate
     */
    //% blockId=datetimeclass_mydatetoage
    //% block=" $this get age from birthdate by $idate in current date"
    //% this.shadow=variables_get this.defl=myDateTime
    //% idate.shadow=datetimeclass_dateshadow
    //% weight=14
    public myDateToAge(idate: dates) {
        let odate = this.myDatetime
        let dateii = new dates(idate.month, idate.day, idate.year)
        let DsinceMin = this.dateToDaySince(datevalue(dateii.month, dateii.day, dateii.year))
        let DateMin = this.dateSinceFor(DsinceMin), LeapMin = this.isLeapYear(DateMin.year)
        let dateoo = new dates(odate.month, odate.day, odate.year)
        let DsinceMax = this.dateToDaySince(datevalue(dateoo.month, dateoo.day, dateoo.year))
        let DateMax = this.dateSinceFor(DsinceMax), LeapMax = this.isLeapYear(DateMax.year)
        let ageCount = 0
        let curY = DateMin.year, curDsince = this.dateToDaySince(datevalue(dateoo.month, dateoo.day, dateii.year))
        let curDate = this.dateSinceFor(curDsince), curLeap = this.isLeapYear(curDate.year)
        while (curY <= DateMax.year) {
            if (curDate.year >= DateMax.year) {
                if (LeapMin) ageCount += (curDate.dayOfYear > DateMin.dayOfYear && (curDate.month > 2 && !curLeap)) ? 1 : 0;
                else ageCount -= (curDate.dayOfYear > DateMin.dayOfYear && (curDate.month > 2 && curLeap)) ? 1 : 0;
            } else if (curDate.year < DateMax.year) {
                ageCount++
            }
            curY++, curLeap = this.isLeapYear(curY)
            curDsince += (curLeap) ? 366 : 365, curDate = this.dateSinceFor(curDsince,DsinceMin,DateMin.year)
        }
        ageCount--
        return ageCount
    }

    /**
     * create raw calendar table from date
     * @param date from current date
     */
    //% blockid=datetimeclass_datetable
    //% block=" $this calendar table as $idate"
    //% this.shadow=variables_get this.defl=myDateTime
    //% idate.shadow=datetimeclass_dateshadow
    //% weight=15
    public dateAsTableList(idate: dates): number[] {
        let dateJ = new dates(idate.month, idate.day, idate.year)
        let dateCountI = this.dateToDaySince(datevalue(dateJ.month, dateJ.day, dateJ.year))
        let dateI = this.dateSinceFor(dateCountI)
        let dateWeek = this.dateToDayOfWeek(datevalue(dateI.month, dateI.day, dateI.year))
        while (dateI.month == dateJ.month || dateWeek != 0) {
            dateCountI--
            dateI = this.dateSinceFor(dateCountI)
            dateWeek = this.dateToDayOfWeek(datevalue(dateI.month, dateI.day, dateI.year))
        }
        let tableDate: number[] = []
        let tableCol = 7, tableRow = 6
        for (let iin = 0; iin < tableCol * tableRow; iin++) {
            dateI = this.dateSinceFor(dateCountI + iin)
            tableDate.push((dateJ.month == dateI.month || (dateI.dayOfYear == 1)) ? dateI.dayOfYear - cdoy[dateI.month] + ((dateI.month > 2 && this.isLeapYear(dateI.year)) ? 1 : 0) : -1)
        }
        return tableDate
    }

    /**
     * Get all values of time as numbers.  
     */
    //% blockid=datetimeclass_alldatetimetogetinstatement
    //% block=" $this date and time from $hour:$minute.$second on $month/$day/$year" advanced=true
    //% this.shadow=variables_get this.defl=myDateTime
    //% handlerStatement
    //% draggableParameters="reporter"
    //% weight=100
    public numericTime(handler: (hour: Hour, minute: Minute, second: Second, month: Month, day: Day, year: Year) => void) {
        const cpuTime = this.cpuTimeInSeconds()
        const t = this.timeFor(cpuTime)
        handler(t.hour, t.minute, t.second, t.month, t.day, t.year)
    }

    /**
     * Current time as a string in the format
     * @param format the format to use
     */
    //% blockid=datetimeclass_time2format
    //% block=" $this time as $format"
    //% this.shadow=variables_get this.defl=myDateTime
    //% weight=70
    public time(format: TimeFormat): string {
        const cpuTime = this.cpuTimeInSeconds()
        const t = this.timeFor(cpuTime)

        // Handle 24-hour format with helper
        if (format == TimeFormat.HHMMSS24hr)
            return this.fullTime(t)

        // Format minutes for all remaining formats
        let minute = this.leftZeroPadTo(t.minute, 2)

        // Simpler military format
        if (format == TimeFormat.HHMM24hr)
            return this.leftZeroPadTo(t.hour, 2) + ":" + minute

        // Data for all other formats
        // Compute strings for other formats
        let hour = null
        let ap = t.hour < 12 ? "am" : "pm"
        if (t.hour == 0) {
            hour = "12:"  // am
        } else if (t.hour > 12) {
            hour = (t.hour - 12) + ":"
        } else {
            hour = (t.hour) + ":"
        }

        // Compose them appropriately
        switch (format) {
            case TimeFormat.HMMSSAMPM:
                return hour + minute + "." + this.leftZeroPadTo(t.second, 2) + ap

            case TimeFormat.HMMAMPM:
                return hour + minute + ap

            case TimeFormat.HMM:
                return hour + minute
        }
        return ""
    }

    /**
     * Current date month name as a string in the format name
     * @param format the format to use
     */
    //% blockid=datetimeclass_datemonth2format 
    //% block=" $this month name as $format"
    //% this.shadow=variables_get this.defl=myDateTime
    //% weight=20
    public nameMonth(format: MonthNameFormat): string {
        const cpuTime = this.cpuTimeInSeconds()
        const t = this.timeFor(cpuTime)
        const dtIdx = monthName[0].indexOf(t.month.toString())
        const dtName = monthName[1][dtIdx]
        switch (format) {
            case MonthNameFormat.Fname:
                return dtName
                break
            case MonthNameFormat.Sname:
                return dtName.substr(0, 3)
                break
        }
        return ""
    }

    /**
     * Current date week name as a string in the format name
     * @param format the format to use
     */
    //% blockid=datetimeclass_dateweek2format
    //% block=" $this week name as $format"
    //% this.shadow=variables_get this.defl=myDateTime
    //% weight=20
    public nameWeek(format: WeekNameFormat): string {
        const cpuTime = this.cpuTimeInSeconds()
        const t = this.timeFor(cpuTime)
        const w = this.dateToDayOfWeek(datevalue(t.month, t.day, t.year))
        const dtIdx = weekName[0].indexOf(w.toString())
        const dtName = weekName[1][dtIdx]
        switch (format) {
            case WeekNameFormat.Fname:
                return dtName
                break
            case WeekNameFormat.S3name:
                return dtName.substr(0, 3)
                break
            case WeekNameFormat.S2name:
                return dtName.substr(0, 2)
                break
        }
        return ""
    }

    /**
     * Current date as a string in the format
     * @param format the format to use
     * @param year type of year format to use
     */
    //% blockid=datetimeclass_date2format
    //% block=" $this date as $format for year in $y"
    //% this.shadow=variables_get this.defl=myDateTime
    //% weight=60
    public date(format: DateFormat, y: YearFormat = 0): string {
        const cpuTime = this.cpuTimeInSeconds()
        const t = this.timeFor(cpuTime)
        const w = this.dateToDayOfWeek(datevalue(t.month, t.day, t.year))
        const dtIdx = [monthName[0].indexOf(t.month.toString()), weekName[0].indexOf(w.toString())]
        const dtName = [monthName[1][dtIdx[0]], weekName[1][dtIdx[1]]]
        switch (format) {
            case DateFormat.DWnsMns:
                return t.day + "/" + dtName[1].substr(0, 3).toUpperCase() + "/" + dtName[0].substr(0, 3).toUpperCase()
                break
            case DateFormat.DWnMn:
                return t.day + "/" + dtName[1] + "/" + dtName[0]
                break
            case DateFormat.MD:
                return t.month + "/" + t.day
                break
            case DateFormat.MDY:
                t.year += y
                return t.month + "/" + t.day + "/" + t.year
                break
            case DateFormat.YYYY_MM_DD:
                return this.fullYear(t, y)
                break

        }
        return ""
    }

    /**
     * Current date and time in a timestamp format (YYYY-MM-DD HH:MM.SS). 
     * @param year type from year format to use
     */
    //% blockid=datetimeclass_dateandtime 
    //% block=" $this date and time stamp for year in $y"
    //% this.shadow=variables_get this.defl=myDateTime
    //% weight=50
    public dateTime(y: YearFormat = 0): string {
        const cpuTime = this.cpuTimeInSeconds()
        const t = this.timeFor(cpuTime)
        return this.fullYear(t, y) + " " + this.fullTime(t)
    }

    /**
     * Seconds since start of arcade 
     */
    //% blockid=datetimeclass_secsincestart
    //% block=" $this seconds since arcade start" advanced=true
    //% this.shadow=variables_get this.defl=myDateTime
    //% weight=40
    public secondsSinceReset(): number {
        return this.cpuTimeInSeconds()
    }


    /**
     * Called when minutes change
     */
    //% blockid=datetimeclass_minuteupdate
    //% block=" $this minute changed" advanced=true
    //% this.shadow=variables_get this.defl=myDateTime
    //% weight=85
    public onMinuteChanged(handler: () => void) {
        control.onEvent(this.TIME_AND_DATE_EVENT, this.TIME_AND_DATE_NEWMINUTE, handler)
    }

    /**
     * Called when hours change
     */
    //% blockid=datetimeclass_hourupdate
    //% block=" $this hour changed" advanced=true
    //% this.shadow=variables_get this.defl=myDateTime
    //% weight=80
    public onHourChanged(handler: () => void) {
        control.onEvent(this.TIME_AND_DATE_EVENT, this.TIME_AND_DATE_NEWHOUR, handler)
    }

    /**
     * Called when days change
     */
    //% blockid=datetimeclass_dayupdate
    //% block=" $this day changed" advanced=true
    //% this.shadow=variables_get this.defl=myDateTime
    //% weight=75
    public onDayChanged(handler: () => void) {
        control.onEvent(this.TIME_AND_DATE_EVENT, this.TIME_AND_DATE_NEWDAY, handler)
    }

    // ***************** This was just for debugging / evaluate problems in API
    // Helpful for debugging / testing
    // /**
    //  * Seconds since start of year  
    //  */
    // //% block="seconds since year" advanced=true
    // export function secondsSinceYear(): number {
    //     const cpuTime = cpuTimeInSeconds()
    //     const t = timeFor(cpuTime)
    //     const deltaTime = cpuTime - cpuTimeAtSetpoint
    //     let sSinceStartOfYear = timeToSetpoint + deltaTime
    //     return sSinceStartOfYear
    // }

    // ********************************************************
}

    //% blockid=datetimeclass_createmydatetimeasclass
    //% block="create empty datetime"
    //% weight=130
    export function createMyDatetime() {
        return new DatetimeObject()
    }
}


