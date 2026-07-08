import { useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    Image,
    ImageURISource,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewToken,
    useWindowDimensions
} from 'react-native';
import Animated, {
    useAnimatedRef,
    useAnimatedScrollHandler,
    useSharedValue
} from 'react-native-reanimated';
import {
    SafeAreaView
} from 'react-native-safe-area-context';
import Button from '../native/components/Button';
import ListItem from '../native/components/ListItem';
import PaginationElement from '../native/components/PaginationElement';

const pages = [
    {
        text: 'Expand Your Reach',
        image: require('../../assets/images/choose.png'),
        sub: 'Connect with more patients and families searching for trusted healthcare and care services.'
    },
    {
        text: 'Manage Bookings Seamlessly',
        image: require('../../assets/images/call.png'),
        sub: 'Handle appointments, availability, and client requests from one simple dashboard.'
    },
    {
        text: 'Deliver Care With Confidence',
        image: require('../../assets/images/carer.png'),
        sub: 'Communicate securely, track client interactions, and provide a smoother care experience every day.'
    },
];
const grad1 = '#085161';
const grad2 = '#11a2c1';

export default function OnBoard() {
    const navigation = useNavigation();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const isDesktop = Platform.OS === 'web' && width >= 900;
    const x = useSharedValue(0);
    const flatListIndex = useSharedValue(0);
    const flatListRef = useAnimatedRef<
        Animated.FlatList<{
            text: string;
            image: ImageURISource;
            sub: string;
        }>
    >();
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIndex(current => {
                const nextIndex = current === pages.length - 1 ? 0 : current + 1;
                flatListRef.current?.scrollToIndex({
                    index: nextIndex,
                    animated: true,
                });
                return nextIndex;
            });
        }, 3600);

        return () => clearInterval(interval);
    }, [flatListRef]);

    const onViewableItemsChanged = useCallback(
        ({ viewableItems }: { viewableItems: ViewToken[] }) => {
            const index = viewableItems[0]?.index ?? 0;
            flatListIndex.value = index;
            setActiveIndex(index);
        },
        [flatListIndex]
    );
    const scrollHandle = useAnimatedScrollHandler({
        onScroll: (event) => {
            x.value = event.contentOffset.x;
        },
    });

    const renderItem = useCallback(
        ({
            item,
            index,
        }: {
            item: { text: string; image: ImageURISource; sub: string };
            index: number;
        }) => {
            return <ListItem item={item} index={index} x={x} />;
        },
        [x]
    );

    if (isDesktop) {
        const page = pages[activeIndex];

        return (
            <SafeAreaView style={styles.desktopShell}>
                <View style={styles.desktopCard}>
                    <View style={styles.desktopMediaPane}>
                        <View style={styles.desktopBrandPill}>
                            <Text style={styles.desktopBrand}>HealthClan Partner</Text>
                        </View>
                        <Image source={page.image} style={styles.desktopImage} resizeMode="contain" />
                    </View>
                    <View style={styles.desktopCopyPane}>
                        <Text style={styles.desktopEyebrow}>Partner care workspace</Text>
                        <Text style={styles.desktopTitle}>{page.text}</Text>
                        <Text style={styles.desktopSub}>{page.sub}</Text>
                        <View style={styles.desktopDots}>
                            {pages.map((item, index) => (
                                <TouchableOpacity
                                    key={item.text}
                                    activeOpacity={0.8}
                                    onPress={() => setActiveIndex(index)}
                                    style={[styles.desktopDot, activeIndex === index && styles.desktopDotActive]}
                                />
                            ))}
                        </View>
                        <TouchableOpacity activeOpacity={0.85} style={styles.desktopButton} onPress={() => router.replace('/create-account')}>
                            <Text style={styles.desktopButtonText}>Get Started</Text>
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.75} onPress={() => router.replace('/sign-in')}>
                            <Text style={styles.desktopLogin}>Already registered? Log in</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Animated.FlatList
                ref={flatListRef}
                onScroll={scrollHandle}
                horizontal
                scrollEventThrottle={16}
                pagingEnabled={true}
                data={pages}
                keyExtractor={(_, index) => index.toString()}
                bounces={false}
                renderItem={renderItem}
                showsHorizontalScrollIndicator={false}
                onViewableItemsChanged={onViewableItemsChanged}
            />
            <View style={styles.bottomPanel}>
                <Text style={styles.mobileTitle}>
                    {pages[activeIndex].text}
                </Text>
                <Text style={styles.mobileSub}>
                    {pages[activeIndex].sub}
                </Text>

                <PaginationElement length={pages.length} x={x} />
                <Button
                    currentIndex={flatListIndex}
                    length={pages.length}
                    flatListRef={flatListRef}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#C6D5DE'
    },
    bottomPanel: {
        width: '100%',
        alignItems: 'center',
        minHeight: 336,
        justifyContent: 'center',
        position: 'absolute',
        bottom: 0,
        backgroundColor: '#E2EAFF',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 34,
        gap: 18,
    },
    mobileTitle: {
        fontFamily: 'Poppins',
        fontWeight: '800',
        fontSize: 24,
        color: '#252525',
        textAlign: 'center',
    },
    mobileSub: {
        fontFamily: 'Poppins',
        fontWeight: '600',
        lineHeight: 21,
        fontSize: 16,
        color: '#252525',
        textAlign: 'center',
        maxWidth: 460,
    },
    desktopShell: {
        flex: 1,
        backgroundColor: '#E9F6FE',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    desktopCard: {
        width: '100%',
        maxWidth: 1120,
        minHeight: 640,
        borderRadius: 28,
        overflow: 'hidden',
        backgroundColor: '#fff',
        flexDirection: 'row',
    },
    desktopMediaPane: {
        flex: 1.04,
        backgroundColor: '#D3E1E8',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 44,
    },
    desktopBrandPill: {
        position: 'absolute',
        top: 34,
        left: 34,
        borderRadius: 999,
        backgroundColor: 'rgba(8, 81, 97, 0.14)',
        paddingHorizontal: 18,
        paddingVertical: 10,
    },
    desktopBrand: {
        color: grad1,
        fontFamily: 'Poppins',
        fontWeight: '900',
        fontSize: 14,
    },
    desktopImage: {
        width: '92%',
        height: '76%',
        maxHeight: 520,
    },
    desktopCopyPane: {
        flex: 0.96,
        justifyContent: 'center',
        paddingHorizontal: 58,
        paddingVertical: 48,
        backgroundColor: '#F4F8FF',
    },
    desktopEyebrow: {
        color: grad2,
        fontFamily: 'Poppins',
        fontSize: 14,
        fontWeight: '900',
        textTransform: 'uppercase',
    },
    desktopTitle: {
        color: grad1,
        fontFamily: 'Poppins',
        fontSize: 46,
        lineHeight: 54,
        fontWeight: '900',
        marginTop: 14,
    },
    desktopSub: {
        color: '#25383E',
        fontFamily: 'Poppins',
        fontSize: 18,
        lineHeight: 29,
        fontWeight: '600',
        marginTop: 22,
    },
    desktopDots: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 36,
        marginBottom: 28,
    },
    desktopDot: {
        width: 11,
        height: 11,
        borderRadius: 6,
        backgroundColor: 'rgba(8, 81, 97, 0.24)',
    },
    desktopDotActive: {
        width: 34,
        backgroundColor: grad1,
    },
    desktopButton: {
        minHeight: 58,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: grad1,
    },
    desktopButtonText: {
        color: '#fff',
        fontFamily: 'Poppins',
        fontSize: 18,
        fontWeight: '900',
    },
    desktopLogin: {
        color: grad1,
        fontFamily: 'Poppins',
        fontSize: 14,
        fontWeight: '800',
        textAlign: 'center',
        marginTop: 20,
    },
});
