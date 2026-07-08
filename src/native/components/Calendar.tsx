import React, { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    FlatList,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');
const DAY_WIDTH = (width - 40) / 7; // smaller → allows scrolling + centering
const grad1 = '#085161'
const grad2 = '#11a2c1';
// Generate a range of days around a base date
const generateDays = (baseDate, range = 10) => {
    const days = [];
    for (let i = -range; i <= range; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + i);
        days.push(d);
    }
    return days;
};

export default function WeekCalendar() {
    const listRef = useRef(null);

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [days, setDays] = useState(generateDays(new Date()));

    // Center selected day
    const centerIndex = Math.floor(days.length / 2);

    useEffect(() => {
        setTimeout(() => {
            listRef.current?.scrollToIndex({
                index: centerIndex,
                animated: false,
            });
        }, 0);
    }, []);

    const centerDay = (index) => {
        listRef.current?.scrollToIndex({
            index,
            animated: true,
            viewPosition: 0.5, // 👈 centers it perfectly
        });
    };

    const handleSelect = (date, index) => {
        setSelectedDate(date);
        centerDay(index);
    };

    const goToNext = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + 7);

        const newDays = generateDays(newDate);
        setDays(newDays);
        setSelectedDate(newDate);

        setTimeout(() => {
            centerDay(Math.floor(newDays.length / 2));
        }, 50);
    };

    const goToPrev = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() - 7);

        const newDays = generateDays(newDate);
        setDays(newDays);
        setSelectedDate(newDate);

        setTimeout(() => {
            centerDay(Math.floor(newDays.length / 2));
        }, 50);
    };

    const isToday = (date) =>
        date.toDateString() === new Date().toDateString();

    const isSelected = (date) =>
        date.toDateString() === selectedDate.toDateString();

    const renderItem = ({ item, index }) => (
        <TouchableOpacity
            onPress={() => handleSelect(item, index)}
            activeOpacity={0.7}
            style={{
                width: DAY_WIDTH,
                alignItems: 'center',
                paddingVertical: 10,
                borderRadius: 20,
            }}
        >


            <View
                style={{
                    marginTop: 6,
                    width: 40,
                    height: 64,
                    borderRadius: 20,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: isSelected(item) ? 0 : 2,
                    borderColor: '#fff',
                    backgroundColor: isSelected(item)
                        ? '#FFF'
                        : isToday(item)
                            ? 'grey'
                            : 'transparent',
                }}
            >
                <Text
                    style={{
                        fontWeight: 'bold',
                        color: isSelected(item) ? grad1 : '#fff',
                    }}
                >
                    {item.getDate()}
                </Text>
                <Text style={{ fontSize: 12, color: isSelected(item) ? grad1 : '#fff' }}>
                    {item.toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>
            </View>

        </TouchableOpacity>
    );

    return (
        <View style={{ paddingVertical: 10, paddingHorizontal: 20 }}>

            {/* Header with buttons */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 10,
                    marginBottom: 10,
                }}
            >
                <TouchableOpacity onPress={goToPrev} style={{ position: 'absolute', top: 65, left: -13, zIndex: 1 }}>
                    <Text style={{ fontSize: 25, color: '#fff' }}>{'<'}</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
                    Upcoming Appointments
                </Text>

                <Text style={{ fontSize: 16, fontWeight: '600', color: '#fff' }}>
                    {selectedDate.toLocaleDateString('en-US', {
                        month: 'long',
                        year: 'numeric',
                    })}
                </Text>

                <TouchableOpacity onPress={goToNext} style={{ position: 'absolute', top: 65, right: -13, zIndex: 10 }}>
                    <Text style={{ fontSize: 25, color: '#fff' }}>{'>'}</Text>
                </TouchableOpacity>

            </View>
            <View style={{
                height: 1,
                backgroundColor: '#E2EAFF',
                marginVertical: 3,
                width: width - 48,
            }} />
            {/* Days List */}
            <FlatList
                ref={listRef}
                data={days}
                keyExtractor={(_, i) => i.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={renderItem}
                snapToInterval={DAY_WIDTH}
                decelerationRate="fast"
                getItemLayout={(_, index) => ({
                    length: DAY_WIDTH,
                    offset: DAY_WIDTH * index,
                    index,
                })}
            />
            <View style={{ height: 135, width: width - 40, borderColor: '#E2EAFF', borderWidth: 1, borderRadius: 20, marginTop: 10, alignItems: 'center', justifyContent: 'flex-start', overflow: 'hidden' }}>
                {/**<Text style={{
                    fontSize: 12, fontWeight: '600', color: '#fff', height: 24, textAlign: 'right', width: '100%',
                    lineHeight: 14, paddingRight: 17, paddingTop: 10, textDecorationLine: 'underline',
                }}>
                    See all
                </Text>**/}
                <ScrollView nestedScrollEnabled={true} style={{ width: '100%', marginTop: -10, flex: 1, overflow: 'hidden' }}
                    contentContainerStyle={{
                        padding: 16,
                    }}
                    showsVerticalScrollIndicator={false}>

                    {/**<Text style={{ fontSize: 14, fontWeight: '600', color: '#fff', paddingHorizontal: 17, paddingBottom: 10 }}>
                        No upcoming appointments</Text>**/}
                    {Array.from({ length: 20 }).map((_, index) => (
                        <View
                            key={index}
                            style={{
                                height: 30, paddingHorizontal: 12, flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',

                                borderRadius: 12, width: '100%',
                            }}
                        >
                           
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }} >
                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' }} />
                                <Text style={{ fontSize: 12, color: '#fff' }}>
                                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
                                    Dr. Smith Turner
                                </Text>

                            </View>
                            <View style={{ width: '100%', height: 1, backgroundColor: '#E2EAFF', marginVertical: 3 }} />


                        </View>

                    ))}
                </ScrollView>

            </View>
        </View>
    );
}