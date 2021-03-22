import {useEffect, useState} from 'react'
import Head from 'next/head'
import Link from 'next/link'
import prisma from '../../lib/prisma'
const dayjs = require('dayjs')
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore')
dayjs.extend(isSameOrBefore)

export default function Type(props) {
    // Initialise state
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(dayjs().month());
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState([]);

    // Handle month changes
    const incrementMonth = () => {
        setSelectedMonth(selectedMonth + 1)
    }

    const decrementMonth = () => {
        setSelectedMonth(selectedMonth - 1)
    }

    // Set up calendar
    var daysInMonth = dayjs().month(selectedMonth).daysInMonth()
    var days = []
    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i)
    }

    const calendar = days.map((day) =>
        <button onClick={(e) => setSelectedDate(dayjs().month(selectedMonth).date(day).format("YYYY-MM-DD"))} disabled={selectedMonth < dayjs().format('MM') && dayjs().month(selectedMonth).format("D") > day} className={"text-center w-10 h-10 rounded-full mx-auto " + (dayjs().isSameOrBefore(dayjs().date(day).month(selectedMonth)) ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-400 font-light') + (dayjs(selectedDate).month(selectedMonth).format("D") == day ? ' bg-blue-600 text-white-important' : '')}>
            {day}
        </button>
    );

    // Handle date change
    useEffect(async () => {
        setLoading(true);
        const res = await fetch('http://localhost:3000/api/availability/bailey?date=' + dayjs(selectedDate).format("YYYY-MM-DD"))
        const data = await res.json()
        setBusy(data.primary.busy)
        setLoading(false)
    }, [selectedDate]);

    // Set up timeslots
    let times = []

    // If we're looking at availability throughout the current date, work out the current number of minutes elapsed throughout the day
    if (selectedDate == dayjs().format("YYYY-MM-DD")) {
        var i = (parseInt(dayjs().startOf('hour').format('H') * 60) + parseInt(dayjs().startOf('hour').format('m')));
    } else {
        var i = 0;
    }
    
    // Until day end, push new times every x minutes
    for (;i < 1440; i += parseInt(props.eventType.length)) {
        times.push(dayjs(selectedDate).hour(Math.floor(i / 60)).minute(i % 60).startOf(props.eventType.length, 'minute').add(props.eventType.length, 'minute').format("YYYY-MM-DD HH:mm:ss"))
    }

    // Check for conflicts
    times.forEach(time => {
        busy.forEach(busyTime => {
            let startTime = dayjs(busyTime.start)
            let endTime = dayjs(busyTime.end)

            // Check if start times are the same
            if (dayjs(time).format('HH:mm') == startTime.format('HH:mm')) {
                const conflictIndex = times.indexOf(time);
                if (conflictIndex > -1) {
                    times.splice(conflictIndex, 1);
                }
            }

            // TODO: Check if time is between start and end times
        });
    });

    // Display available times
    const availableTimes = times.map((time) =>
        <div>
            <Link href={"/" + props.user.username + "/book?date=" + selectedDate + "T" + dayjs(time).format("HH:mm:ss") + "Z&type=" + props.eventType.id}>
                <a key={time} className="block font-medium mb-4 text-blue-600 border border-blue-600 rounded hover:text-white hover:bg-blue-600 py-4">{dayjs(time).format("hh:mma")}</a>
            </Link>
        </div>
    );

    return (
        <div>
            <Head>
                <title>{props.eventType.title} | {props.user.name} | Calendso</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={"mx-auto my-24 transition-max-width ease-in-out duration-500 " + (selectedDate ? 'max-w-6xl' : 'max-w-3xl')}>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="sm:flex px-4 py-5 sm:p-6">
                        <div className={"sm:border-r " + (selectedDate ? 'sm:w-1/3' : 'sm:w-1/2')}>
                            <img src={props.user.avatar} alt="Avatar" className="w-16 h-16 rounded-full mb-4"/>
                            <h2 className="font-medium text-gray-500">{props.user.name}</h2>
                            <h1 className="text-3xl font-semibold text-gray-800 mb-4">{props.eventType.title}</h1>
                            <p className="text-gray-500 mb-4">
                                <svg className="inline-block w-4 h-4 mr-1 -mt-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                </svg>
                                {props.eventType.length} minutes
                            </p>
                            <p className="text-gray-600">{props.eventType.description}</p>
                        </div>
                        <div className={"mt-8 sm:mt-0 " + (selectedDate ? 'sm:w-1/3 border-r sm:px-4' : 'sm:w-1/2 sm:pl-4')}>
                            <div className="flex text-gray-600 font-light text-xl mb-4 ml-2">
                                <span className="w-1/2">{dayjs().month(selectedMonth).format("MMMM YYYY")}</span>
                                <div className="w-1/2 text-right">
                                    <button onClick={decrementMonth} className={"mr-4 " + (selectedMonth < dayjs().format('MM') && 'text-gray-400')} disabled={selectedMonth < dayjs().format('MM')}>
                                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    <button onClick={incrementMonth}>
                                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-7 gap-y-4 text-center">
                                {calendar}
                            </div>
                        </div>
                        <div className={"sm:pl-4 mt-8 sm:mt-0 text-center " + (selectedDate ? 'sm:w-1/3' : 'sm:w-1/2 hidden')}>
                            <div className="text-gray-600 font-light text-xl mb-4 text-left">
                                <span className="w-1/2">{dayjs(selectedDate).format("dddd DD MMMM YYYY")}</span>
                            </div>
                            {!loading ? availableTimes : <div className="loader"></div>}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}

export async function getServerSideProps(context) {
    const user = await prisma.user.findFirst({
        where: {
          username: context.query.user,
        },
        select: {
            username: true,
            name: true,
            bio: true,
            avatar: true,
            eventTypes: true
        }
    });

    const eventType = await prisma.eventType.findUnique({
        where: {
          id: parseInt(context.query.type),
        },
        select: {
            id: true,
            title: true,
            description: true,
            length: true
        }
    });

    return {
        props: {
            user,
            eventType
        },
    }
}