import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useNavigation, } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import {
    SafeAreaView
} from 'react-native-safe-area-context';
import { partnerApi, setApiToken } from '../lib/api';
import { currencyForPhoneOption, globalCurrencies } from '../lib/global-options';
import { isValidEmail, isValidPassword, onlyDigits, parseDob } from '../lib/validation';
export const IOS = Platform.OS === "ios";
const grad1 = '#085161'
const grad2 = '#11a2c1';

type SelectOption = {
    label: string;
    value: string;
};

const MARITAL_STATUS_OPTIONS: SelectOption[] = [
    { label: 'Single', value: 'single' },
    { label: 'Married', value: 'married' },
    { label: 'Divorced', value: 'divorced' },
    { label: 'Widowed', value: 'widowed' },
    { label: 'Separated', value: 'separated' },
    { label: 'Prefer not to say', value: 'prefer_not_to_say' },
];

const COUNTRY_CODE_OPTIONS: SelectOption[] = [
    { label: 'Afghanistan (+93)', value: '+93' },
    { label: 'Aland Islands (+358)', value: '+358' },
    { label: 'Albania (+355)', value: '+355' },
    { label: 'Algeria (+213)', value: '+213' },
    { label: 'American Samoa (+1 684)', value: '+1684' },
    { label: 'Andorra (+376)', value: '+376' },
    { label: 'Angola (+244)', value: '+244' },
    { label: 'Anguilla (+1 264)', value: '+1264' },
    { label: 'Antigua and Barbuda (+1 268)', value: '+1268' },
    { label: 'Argentina (+54)', value: '+54' },
    { label: 'Armenia (+374)', value: '+374' },
    { label: 'Aruba (+297)', value: '+297' },
    { label: 'Australia (+61)', value: '+61' },
    { label: 'Austria (+43)', value: '+43' },
    { label: 'Azerbaijan (+994)', value: '+994' },
    { label: 'Bahamas (+1 242)', value: '+1242' },
    { label: 'Bahrain (+973)', value: '+973' },
    { label: 'Bangladesh (+880)', value: '+880' },
    { label: 'Barbados (+1 246)', value: '+1246' },
    { label: 'Belarus (+375)', value: '+375' },
    { label: 'Belgium (+32)', value: '+32' },
    { label: 'Belize (+501)', value: '+501' },
    { label: 'Benin (+229)', value: '+229' },
    { label: 'Bermuda (+1 441)', value: '+1441' },
    { label: 'Bhutan (+975)', value: '+975' },
    { label: 'Bolivia (+591)', value: '+591' },
    { label: 'Bosnia and Herzegovina (+387)', value: '+387' },
    { label: 'Botswana (+267)', value: '+267' },
    { label: 'Brazil (+55)', value: '+55' },
    { label: 'British Virgin Islands (+1 284)', value: '+1284' },
    { label: 'Brunei (+673)', value: '+673' },
    { label: 'Bulgaria (+359)', value: '+359' },
    { label: 'Burkina Faso (+226)', value: '+226' },
    { label: 'Burundi (+257)', value: '+257' },
    { label: 'Cambodia (+855)', value: '+855' },
    { label: 'Cameroon (+237)', value: '+237' },
    { label: 'Canada (+1)', value: '+1' },
    { label: 'Cape Verde (+238)', value: '+238' },
    { label: 'Cayman Islands (+1 345)', value: '+1345' },
    { label: 'Central African Republic (+236)', value: '+236' },
    { label: 'Chad (+235)', value: '+235' },
    { label: 'Chile (+56)', value: '+56' },
    { label: 'China (+86)', value: '+86' },
    { label: 'Christmas Island (+61)', value: '+61' },
    { label: 'Cocos Islands (+61)', value: '+61' },
    { label: 'Colombia (+57)', value: '+57' },
    { label: 'Comoros (+269)', value: '+269' },
    { label: 'Congo (+242)', value: '+242' },
    { label: 'Cook Islands (+682)', value: '+682' },
    { label: 'Costa Rica (+506)', value: '+506' },
    { label: 'Croatia (+385)', value: '+385' },
    { label: 'Cuba (+53)', value: '+53' },
    { label: 'Curacao (+599)', value: '+599' },
    { label: 'Cyprus (+357)', value: '+357' },
    { label: 'Czech Republic (+420)', value: '+420' },
    { label: 'Democratic Republic of the Congo (+243)', value: '+243' },
    { label: 'Denmark (+45)', value: '+45' },
    { label: 'Djibouti (+253)', value: '+253' },
    { label: 'Dominica (+1 767)', value: '+1767' },
    { label: 'Dominican Republic (+1 809)', value: '+1809' },
    { label: 'Dominican Republic (+1 829)', value: '+1829' },
    { label: 'Dominican Republic (+1 849)', value: '+1849' },
    { label: 'Ecuador (+593)', value: '+593' },
    { label: 'Egypt (+20)', value: '+20' },
    { label: 'El Salvador (+503)', value: '+503' },
    { label: 'Equatorial Guinea (+240)', value: '+240' },
    { label: 'Eritrea (+291)', value: '+291' },
    { label: 'Estonia (+372)', value: '+372' },
    { label: 'Eswatini (+268)', value: '+268' },
    { label: 'Ethiopia (+251)', value: '+251' },
    { label: 'Falkland Islands (+500)', value: '+500' },
    { label: 'Faroe Islands (+298)', value: '+298' },
    { label: 'Fiji (+679)', value: '+679' },
    { label: 'Finland (+358)', value: '+358' },
    { label: 'France (+33)', value: '+33' },
    { label: 'French Guiana (+594)', value: '+594' },
    { label: 'French Polynesia (+689)', value: '+689' },
    { label: 'Gabon (+241)', value: '+241' },
    { label: 'Gambia (+220)', value: '+220' },
    { label: 'Georgia (+995)', value: '+995' },
    { label: 'Germany (+49)', value: '+49' },
    { label: 'Ghana (+233)', value: '+233' },
    { label: 'Gibraltar (+350)', value: '+350' },
    { label: 'Greece (+30)', value: '+30' },
    { label: 'Greenland (+299)', value: '+299' },
    { label: 'Grenada (+1 473)', value: '+1473' },
    { label: 'Guadeloupe (+590)', value: '+590' },
    { label: 'Guam (+1 671)', value: '+1671' },
    { label: 'Guatemala (+502)', value: '+502' },
    { label: 'Guernsey (+44)', value: '+44' },
    { label: 'Guinea (+224)', value: '+224' },
    { label: 'Guinea-Bissau (+245)', value: '+245' },
    { label: 'Guyana (+592)', value: '+592' },
    { label: 'Haiti (+509)', value: '+509' },
    { label: 'Honduras (+504)', value: '+504' },
    { label: 'Hong Kong (+852)', value: '+852' },
    { label: 'Hungary (+36)', value: '+36' },
    { label: 'Iceland (+354)', value: '+354' },
    { label: 'India (+91)', value: '+91' },
    { label: 'Indonesia (+62)', value: '+62' },
    { label: 'Iran (+98)', value: '+98' },
    { label: 'Iraq (+964)', value: '+964' },
    { label: 'Ireland (+353)', value: '+353' },
    { label: 'Isle of Man (+44)', value: '+44' },
    { label: 'Israel (+972)', value: '+972' },
    { label: 'Italy (+39)', value: '+39' },
    { label: 'Ivory Coast (+225)', value: '+225' },
    { label: 'Jamaica (+1 876)', value: '+1876' },
    { label: 'Japan (+81)', value: '+81' },
    { label: 'Jersey (+44)', value: '+44' },
    { label: 'Jordan (+962)', value: '+962' },
    { label: 'Kazakhstan (+7)', value: '+7' },
    { label: 'Kenya (+254)', value: '+254' },
    { label: 'Kiribati (+686)', value: '+686' },
    { label: 'Kosovo (+383)', value: '+383' },
    { label: 'Kuwait (+965)', value: '+965' },
    { label: 'Kyrgyzstan (+996)', value: '+996' },
    { label: 'Laos (+856)', value: '+856' },
    { label: 'Latvia (+371)', value: '+371' },
    { label: 'Lebanon (+961)', value: '+961' },
    { label: 'Lesotho (+266)', value: '+266' },
    { label: 'Liberia (+231)', value: '+231' },
    { label: 'Libya (+218)', value: '+218' },
    { label: 'Liechtenstein (+423)', value: '+423' },
    { label: 'Lithuania (+370)', value: '+370' },
    { label: 'Luxembourg (+352)', value: '+352' },
    { label: 'Macau (+853)', value: '+853' },
    { label: 'Madagascar (+261)', value: '+261' },
    { label: 'Malawi (+265)', value: '+265' },
    { label: 'Malaysia (+60)', value: '+60' },
    { label: 'Maldives (+960)', value: '+960' },
    { label: 'Mali (+223)', value: '+223' },
    { label: 'Malta (+356)', value: '+356' },
    { label: 'Marshall Islands (+692)', value: '+692' },
    { label: 'Martinique (+596)', value: '+596' },
    { label: 'Mauritania (+222)', value: '+222' },
    { label: 'Mauritius (+230)', value: '+230' },
    { label: 'Mayotte (+262)', value: '+262' },
    { label: 'Mexico (+52)', value: '+52' },
    { label: 'Micronesia (+691)', value: '+691' },
    { label: 'Moldova (+373)', value: '+373' },
    { label: 'Monaco (+377)', value: '+377' },
    { label: 'Mongolia (+976)', value: '+976' },
    { label: 'Montenegro (+382)', value: '+382' },
    { label: 'Montserrat (+1 664)', value: '+1664' },
    { label: 'Morocco (+212)', value: '+212' },
    { label: 'Mozambique (+258)', value: '+258' },
    { label: 'Myanmar (+95)', value: '+95' },
    { label: 'Namibia (+264)', value: '+264' },
    { label: 'Nauru (+674)', value: '+674' },
    { label: 'Nepal (+977)', value: '+977' },
    { label: 'Netherlands (+31)', value: '+31' },
    { label: 'New Caledonia (+687)', value: '+687' },
    { label: 'New Zealand (+64)', value: '+64' },
    { label: 'Nicaragua (+505)', value: '+505' },
    { label: 'Niger (+227)', value: '+227' },
    { label: 'Nigeria (+234)', value: '+234' },
    { label: 'Niue (+683)', value: '+683' },
    { label: 'Norfolk Island (+672)', value: '+672' },
    { label: 'North Korea (+850)', value: '+850' },
    { label: 'North Macedonia (+389)', value: '+389' },
    { label: 'Northern Mariana Islands (+1 670)', value: '+1670' },
    { label: 'Norway (+47)', value: '+47' },
    { label: 'Oman (+968)', value: '+968' },
    { label: 'Pakistan (+92)', value: '+92' },
    { label: 'Palau (+680)', value: '+680' },
    { label: 'Palestine (+970)', value: '+970' },
    { label: 'Panama (+507)', value: '+507' },
    { label: 'Papua New Guinea (+675)', value: '+675' },
    { label: 'Paraguay (+595)', value: '+595' },
    { label: 'Peru (+51)', value: '+51' },
    { label: 'Philippines (+63)', value: '+63' },
    { label: 'Poland (+48)', value: '+48' },
    { label: 'Portugal (+351)', value: '+351' },
    { label: 'Puerto Rico (+1 787)', value: '+1787' },
    { label: 'Puerto Rico (+1 939)', value: '+1939' },
    { label: 'Qatar (+974)', value: '+974' },
    { label: 'Reunion (+262)', value: '+262' },
    { label: 'Romania (+40)', value: '+40' },
    { label: 'Russia (+7)', value: '+7' },
    { label: 'Rwanda (+250)', value: '+250' },
    { label: 'Saint Barthelemy (+590)', value: '+590' },
    { label: 'Saint Helena (+290)', value: '+290' },
    { label: 'Saint Kitts and Nevis (+1 869)', value: '+1869' },
    { label: 'Saint Lucia (+1 758)', value: '+1758' },
    { label: 'Saint Martin (+590)', value: '+590' },
    { label: 'Saint Pierre and Miquelon (+508)', value: '+508' },
    { label: 'Saint Vincent and the Grenadines (+1 784)', value: '+1784' },
    { label: 'Samoa (+685)', value: '+685' },
    { label: 'San Marino (+378)', value: '+378' },
    { label: 'Sao Tome and Principe (+239)', value: '+239' },
    { label: 'Saudi Arabia (+966)', value: '+966' },
    { label: 'Senegal (+221)', value: '+221' },
    { label: 'Serbia (+381)', value: '+381' },
    { label: 'Seychelles (+248)', value: '+248' },
    { label: 'Sierra Leone (+232)', value: '+232' },
    { label: 'Singapore (+65)', value: '+65' },
    { label: 'Sint Maarten (+1 721)', value: '+1721' },
    { label: 'Slovakia (+421)', value: '+421' },
    { label: 'Slovenia (+386)', value: '+386' },
    { label: 'Solomon Islands (+677)', value: '+677' },
    { label: 'Somalia (+252)', value: '+252' },
    { label: 'South Africa (+27)', value: '+27' },
    { label: 'South Korea (+82)', value: '+82' },
    { label: 'South Sudan (+211)', value: '+211' },
    { label: 'Spain (+34)', value: '+34' },
    { label: 'Sri Lanka (+94)', value: '+94' },
    { label: 'Sudan (+249)', value: '+249' },
    { label: 'Suriname (+597)', value: '+597' },
    { label: 'Svalbard and Jan Mayen (+47)', value: '+47' },
    { label: 'Sweden (+46)', value: '+46' },
    { label: 'Switzerland (+41)', value: '+41' },
    { label: 'Syria (+963)', value: '+963' },
    { label: 'Taiwan (+886)', value: '+886' },
    { label: 'Tajikistan (+992)', value: '+992' },
    { label: 'Tanzania (+255)', value: '+255' },
    { label: 'Thailand (+66)', value: '+66' },
    { label: 'Timor-Leste (+670)', value: '+670' },
    { label: 'Togo (+228)', value: '+228' },
    { label: 'Tokelau (+690)', value: '+690' },
    { label: 'Tonga (+676)', value: '+676' },
    { label: 'Trinidad and Tobago (+1 868)', value: '+1868' },
    { label: 'Tunisia (+216)', value: '+216' },
    { label: 'Turkey (+90)', value: '+90' },
    { label: 'Turkmenistan (+993)', value: '+993' },
    { label: 'Turks and Caicos Islands (+1 649)', value: '+1649' },
    { label: 'Tuvalu (+688)', value: '+688' },
    { label: 'U.S. Virgin Islands (+1 340)', value: '+1340' },
    { label: 'Uganda (+256)', value: '+256' },
    { label: 'Ukraine (+380)', value: '+380' },
    { label: 'United Arab Emirates (+971)', value: '+971' },
    { label: 'United Kingdom (+44)', value: '+44' },
    { label: 'United States (+1)', value: '+1' },
    { label: 'Uruguay (+598)', value: '+598' },
    { label: 'Uzbekistan (+998)', value: '+998' },
    { label: 'Vanuatu (+678)', value: '+678' },
    { label: 'Vatican City (+39)', value: '+39' },
    { label: 'Venezuela (+58)', value: '+58' },
    { label: 'Vietnam (+84)', value: '+84' },
    { label: 'Wallis and Futuna (+681)', value: '+681' },
    { label: 'Western Sahara (+212)', value: '+212' },
    { label: 'Yemen (+967)', value: '+967' },
    { label: 'Zambia (+260)', value: '+260' },
    { label: 'Zimbabwe (+263)', value: '+263' },
];

const DATE_PICKER_DAYS = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, '0'));
const DATE_PICKER_MONTHS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
const DATE_PICKER_CURRENT_YEAR = new Date().getFullYear();
const DATE_PICKER_YEARS = Array.from({ length: 100 }, (_, index) => String(DATE_PICKER_CURRENT_YEAR - index));

function countryNameFromPhoneOption(label: string, fallbackCode: string) {
    const countryName = label.replace(/\s*\([^)]*\)\s*$/, '').trim();
    if (countryName) return countryName;

    const fallback = COUNTRY_CODE_OPTIONS.find(option => option.value === fallbackCode);
    return fallback?.label.replace(/\s*\([^)]*\)\s*$/, '').trim() || '';
}

function SelectField({
    placeholder,
    options,
    value,
    onChange,
    displayLabel,
    style,
    searchable = false,
}: {
    placeholder: string;
    options: SelectOption[];
    value: string;
    onChange: (value: string, option: SelectOption) => void;
    displayLabel?: string;
    style?: any;
    searchable?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const selectedOption = options.find(option => option.value === value);
    const normalizedQuery = query.trim().toLowerCase();
    const filteredOptions = normalizedQuery
        ? options.filter(option =>
            option.label.toLowerCase().includes(normalizedQuery) ||
            option.value.toLowerCase().includes(normalizedQuery)
        )
        : options;

    const selectOption = (selectedValue: string) => {
        const option = options.find(item => item.value === selectedValue);
        if (option) {
            onChange(selectedValue, option);
        }
        setOpen(false);
        setQuery('');
    };

    return (
        <>
            <Pressable
                style={[styles.field, styles.selectField, style]}
                onPress={() => setOpen(true)}
            >
                <Text
                    numberOfLines={1}
                    style={[styles.selectText, !value && styles.placeholderText]}
                >
                    {displayLabel || selectedOption?.label || placeholder}
                </Text>
                <Ionicons name="chevron-down" size={18} color="rgba(19, 202, 214, 1)" />
            </Pressable>

            <Modal
                animationType="slide"
                transparent
                visible={open}
                onRequestClose={() => setOpen(false)}
            >
                <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
                    <Pressable style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{placeholder}</Text>
                            <Ionicons name="close" size={22} color="#252525" onPress={() => setOpen(false)} />
                        </View>

                        {searchable && (
                            <TextInput
                                placeholder="Search"
                                placeholderTextColor={'rgba(19, 202, 214, 1)'}
                                autoCorrect={false}
                                value={query}
                                style={[styles.field, styles.searchField]}
                                onChangeText={setQuery}
                            />
                        )}

                        <FlatList
                            data={filteredOptions}
                            keyExtractor={(item, index) => `${item.label}-${item.value}-${index}`}
                            keyboardShouldPersistTaps="handled"
                            renderItem={({ item }) => (
                                <Pressable
                                    style={[
                                        styles.option,
                                        item.value === value && styles.selectedOption
                                    ]}
                                    onPress={() => selectOption(item.value)}
                                >
                                    <Text style={styles.optionText}>{item.label}</Text>
                                    {item.value === value && (
                                        <Ionicons name="checkmark" size={18} color={grad1} />
                                    )}
                                </Pressable>
                            )}
                            ListEmptyComponent={
                                <Text style={styles.emptyText}>No option found</Text>
                            }
                        />
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}

function DatePickerField({
    value,
    onChange,
}: {
    value: string;
    onChange: (value: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [initialDay, initialMonth, initialYear] = value.split('/');
    const [day, setDay] = useState(initialDay || '01');
    const [month, setMonth] = useState(initialMonth || '01');
    const [year, setYear] = useState(initialYear || String(DATE_PICKER_CURRENT_YEAR - 25));

    useEffect(() => {
        if (!value) return;

        const [nextDay, nextMonth, nextYear] = value.split('/');
        if (nextDay) setDay(nextDay);
        if (nextMonth) setMonth(nextMonth);
        if (nextYear) setYear(nextYear);
    }, [value]);

    const renderColumn = (
        title: string,
        values: string[],
        selectedValue: string,
        onSelect: (item: string) => void,
    ) => (
        <View style={styles.dateColumn}>
            <Text style={styles.dateColumnTitle}>{title}</Text>
            <FlatList
                data={values}
                keyExtractor={item => item}
                style={styles.dateList}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <Pressable
                        style={[styles.dateOption, item === selectedValue && styles.selectedOption]}
                        onPress={() => onSelect(item)}
                    >
                        <Text style={styles.optionText}>{item}</Text>
                    </Pressable>
                )}
            />
        </View>
    );

    return (
        <>
            <Pressable
                style={[styles.field, styles.selectField]}
                onPress={() => setOpen(true)}
            >
                <Text
                    numberOfLines={1}
                    style={[styles.selectText, !value && styles.placeholderText]}
                >
                    {value || 'Date of Birth'}
                </Text>
                <Ionicons name="calendar-outline" size={18} color="rgba(19, 202, 214, 1)" />
            </Pressable>

            <Modal
                animationType="slide"
                transparent
                visible={open}
                onRequestClose={() => setOpen(false)}
            >
                <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
                    <Pressable style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Date of Birth</Text>
                            <Ionicons name="close" size={22} color="#252525" onPress={() => setOpen(false)} />
                        </View>

                        <View style={styles.dateColumns}>
                            {renderColumn('Day', DATE_PICKER_DAYS, day, setDay)}
                            {renderColumn('Month', DATE_PICKER_MONTHS, month, setMonth)}
                            {renderColumn('Year', DATE_PICKER_YEARS, year, setYear)}
                        </View>

                        <LinearGradient
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            colors={[grad1, grad2]}
                            locations={[0.196, 1]}
                            style={[styles.button, styles.dateDoneButton]}
                        >
                            <TouchableOpacity
                                activeOpacity={0.7}
                                style={styles.dateDonePressable}
                                onPress={() => {
                                    onChange(`${day}/${month}/${year}`);
                                    setOpen(false);
                                }}
                            >
                                <Text style={styles.dateDoneText}>Done</Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}
//export const height = IOS
//  ? Dimensions.get("window").height
//   : require("react-native-extra-dimensions-android").get("REAL_WINDOW_HEIGHT");
export default function CreateAccount() {
    const [fullName, setFullName] = useState('');
    const [dob, setDob] = useState('');
    const [address, setAddress] = useState('');
    const [email, setEmail] = useState('');
    const [countryCode, setCountryCode] = useState('');
    const [countryCodeLabel, setCountryCodeLabel] = useState('');
    const [currency, setCurrency] = useState('GBP');
    const [phone, setPhone] = useState('');
    const [maritalStatus, setMaritalStatus] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [confirmVisible, setConfirmVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const handleChange = (name: any, val: any) => {
        if (name === 'fullName') {
            setFullName(val);
        } else if (name === 'dob') {
            setDob(val);
        } else if (name === 'address') {
            setAddress(val);
        } else if (name === 'email') {
            setEmail(val);
        } else if (name === 'countryCode') {
            setCountryCode(val);
        } else if (name === 'currency') {
            setCurrency(val);
        } else if (name === 'phone') {
            setPhone(val);
        } else if (name === 'maritalStatus') {
            setMaritalStatus(val);
        } else if (name === 'password') {
            setPassword(val);
        } else if (name === 'confirm') {
            setConfirm(val);
        }
    }
    const navigation = useNavigation();
    useEffect(() => {
        navigation.setOptions({ headerShown: false });
    }, [navigation]);
    const handleSubmit = async () => {
        const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ');
        const trimmedEmail = email.trim();
        const trimmedPhone = onlyDigits(phone);
        const parsedDob = dob.trim() ? parseDob(dob.trim()) : undefined;
        const selectedCountry = countryNameFromPhoneOption(countryCodeLabel, countryCode);

        setMessage('');

        if (!firstName || !lastName) {
            setMessage('Please enter your first and last name.');
            return;
        }

        if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
            setMessage('Please enter a valid email address.');
            return;
        }

        if (!parsedDob) {
            setMessage('Please select a valid date of birth.');
            return;
        }

        if (!address.trim()) {
            setMessage('Please enter your address.');
            return;
        }

        if (!countryCode) {
            setMessage('Please select your country code.');
            return;
        }

        if (trimmedPhone.length < 7) {
            setMessage('Please enter a valid phone number.');
            return;
        }

        if (!maritalStatus) {
            setMessage('Please select your marital status.');
            return;
        }

        if (!isValidPassword(password)) {
            setMessage('Password must be at least 8 characters.');
            return;
        }

        if (password !== confirm) {
            setMessage('Passwords do not match.');
            return;
        }

        setLoading(true);

        try {
            const response = await partnerApi.auth.register({
                firstName,
                lastName,
                email: trimmedEmail,
                countryCode,
                phone: trimmedPhone,
                dateOfBirth: parsedDob,
                maritalStatus,
                address: { line1: address.trim(), country: selectedCountry },
                country: selectedCountry,
                password,
                type: 'doctor',
            });
            setApiToken(response.token);
            const convertedFee = await partnerApi.convertCurrency({ amount: 50, from: 'GBP', to: currency }, response.token)
                .then(result => result.convertedAmount)
                .catch(() => undefined);
            await Promise.allSettled([
                partnerApi.savePreferences({ currency, walletCurrency: currency }, response.token),
                partnerApi.doctorProfile({
                    currency,
                    ...(convertedFee !== undefined ? { consultationFee: convertedFee } : {}),
                    videoProvider: 'twilio',
                }, response.token),
            ]);

            router.replace({
                pathname: '/email-confirmation',
                params: {
                    email: trimmedEmail,
                    authToken: response.token,
                    emailDelivery: response.verificationEmailSent === false ? 'failed' : 'sent',
                },
            } as any);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Unable to create account.');
        } finally {
            setLoading(false);
        }
    }
    const gotoLogin = () => {
        router.replace("sign-in" as any);
    }
    const gotoPrivacy = () => {
        router.push("privacy" as any);
    }
    const gotoTerms = () => {
        router.push("terms" as any);
    }
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={[styles.slide, {
                backgroundColor: '#E9F6FE', alignSelf: 'center',
                width: '100%',
            }]} showsHorizontalScrollIndicator={false} showsVerticalScrollIndicator={false}>

                <KeyboardAvoidingView style={[styles.log, { alignSelf: 'center', width: '100%', justifyContent: 'flex-start', flex: 1 }]}>
                    <LinearGradient
                        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} colors={[grad1, grad2]}
                        locations={[0.196, 1]}
                        style={[styles.top, {
                            flexDirection: 'row', alignContent: 'center', padding: 0, alignItems: 'center',
                            justifyContent: 'flex-start', paddingLeft: 20,

                        }]}
                    >
                        <Ionicons name="chevron-back" size={24} color="#fff" onPress={
                            () => {
                                router.push('/onboard');
                            }
                        } />
                        <Text style={[styles.create]} >
                            New Account

                        </Text>

                    </LinearGradient>
                  
                    <TextInput
                        placeholder="Full name"
                        placeholderTextColor={'rgba(19, 202, 214, 1)'}
                        autoCorrect={false}
                        value={fullName}
                        style={styles.field}
                        onChangeText={v => handleChange('fullName', v)}
                    />

        

                    <DatePickerField
                        value={dob}
                        onChange={v => handleChange('dob', v)}
                    />

                    <TextInput
                        placeholder="Address: Plot 123, Street, City, Country"
                        placeholderTextColor={'rgba(19, 202, 214, 1)'}
                        autoCorrect={false}
                        autoCapitalize={'none'}
                        keyboardType={'numbers-and-punctuation'}
                        value={address}
                        style={styles.field}
                        onChangeText={v => handleChange('address', v)}
                    />

               
                    <TextInput
                        placeholder="Email"
                        placeholderTextColor={'rgba(19, 202, 214, 1)'}
                        autoCorrect={false}
                        autoCapitalize={'none'}
                        keyboardType={'email-address'}
                        value={email}
                        style={styles.field}
                        onChangeText={v => handleChange('email', v)}
                    />

            

                    <View style={styles.phoneRow}>
                        <SelectField
                            placeholder="Code"
                            options={COUNTRY_CODE_OPTIONS}
                            value={countryCode}
                            displayLabel={countryCodeLabel}
                            style={styles.countryCodeField}
                            searchable
                            onChange={(v, option) => {
                                handleChange('countryCode', v);
                                setCountryCodeLabel(option.label);
                                setCurrency(currencyForPhoneOption(option.label, v, currency));
                            }}
                        />

                        <TextInput
                            placeholder="Phone number"
                            placeholderTextColor={'rgba(19, 202, 214, 1)'}
                            autoCorrect={false}
                            autoCapitalize={'none'}
                            keyboardType={'phone-pad'}
                            value={phone}
                            style={[styles.field, styles.phoneField]}
                            onChangeText={v => handleChange('phone', v)}
                        />
                    </View>

                    <SelectField
                        placeholder="Currency"
                        options={globalCurrencies.map(item => ({ label: item, value: item }))}
                        value={currency}
                        onChange={v => handleChange('currency', v)}
                    />


                    <SelectField
                        placeholder="Marital status"
                        options={MARITAL_STATUS_OPTIONS}
                        value={maritalStatus}
                        onChange={v => handleChange('maritalStatus', v)}
                    />

                    <View style={styles.passwordField}>
                        <TextInput
                            placeholder="Password"
                            placeholderTextColor={'rgba(19, 202, 214, 1)'}
                            autoCorrect={false}
                            autoCapitalize={'none'}
                            value={password}
                            secureTextEntry={!passwordVisible}
                            style={styles.passwordInput}
                            onChangeText={v => handleChange('password', v)}
                        />
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => setPasswordVisible(current => !current)}
                            style={styles.passwordToggle}
                        >
                            <Ionicons
                                name={!passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                                size={22}
                                color="rgba(19, 202, 214, 1)"
                            />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.passwordField}>
                        <TextInput
                            placeholder="Confirm Password"
                            placeholderTextColor={'rgba(19, 202, 214, 1)'}
                            autoCorrect={false}
                            autoCapitalize={'none'}
                            value={confirm}
                            secureTextEntry={!confirmVisible}
                            style={styles.passwordInput}
                            onChangeText={v => handleChange('confirm', v)}
                        />
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => setConfirmVisible(current => !current)}
                            style={styles.passwordToggle}
                        >
                            <Ionicons
                                name={!confirmVisible ? 'eye-off-outline' : 'eye-outline'}
                                size={22}
                                color="rgba(19, 202, 214, 1)"
                            />
                        </TouchableOpacity>
                    </View>

                    {!!message && (
                        <Text style={styles.messageText}>{message}</Text>
                    )}
                    <Text style={{
                        textAlign: 'center', color: '#252525', fontSize: 12, marginVertical: 15, maxWidth: '80%',
                    }} >By continuing, you agree to our&nbsp;&nbsp;
                        <Text style={{ color: grad1, fontWeight: '900' }} onPress={v => gotoTerms()}>Terms of Use&nbsp;&nbsp;</Text>
                        and&nbsp;&nbsp;
                        <Text style={{ color: grad1, fontWeight: '900' }} onPress={v => gotoPrivacy()}>  Privacy Policy</Text>
                    </Text>


                    <LinearGradient
                        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} colors={[grad1, grad2,]}
                        locations={[0.196, 1]}
                        style={[styles.button, {
                            backgroundColor: '#4267B1', flexDirection: 'row', alignContent: 'center', padding: 0, alignItems: 'center',
                            justifyContent: 'center', marginVertical: 15, maxWidth: 161

                        }]}
                    >
                        <TouchableOpacity activeOpacity={.7}
                            style={{
                                width: '100%', height: '100%', flex: 1, flexDirection: 'row', alignContent: 'center', alignItems: 'center', justifyContent: 'center'

                            }}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            <Text
                                style={{ fontFamily: 'Poppins', fontSize: 24, height: 48, fontWeight: 800, lineHeight: 48, textAlign: 'center', color: '#FFFFFF' }}
                            >Sign Up</Text>
                            <ActivityIndicator animating={loading} color={'#FFFFFF'} />
                        </TouchableOpacity>
                    </LinearGradient>


                    <Text style={{
                        textAlign: 'center', color: '#252525', fontSize: 12, marginVertical: 15,
                    }} >Already have an account?&nbsp;&nbsp;
                        <Text style={{ color: grad1, fontWeight: '900' }} onPress={v => gotoLogin()}>Login</Text>

                    </Text>

                </KeyboardAvoidingView>
            </ScrollView>
        </SafeAreaView>

    );
}
const styles = StyleSheet.create({
    top: {
        height: 80,
        width: '100%',
        marginBottom: 20,
        maxHeight: 80,
        flexDirection: 'column',
        alignContent: 'center',
        alignItems: 'center',
        justifyContent: 'center'
    },
    intext: {
        textAlign: 'left', color: '#000', fontSize: 20, marginTop: 12, marginBottom: 6, width: '100%',
        paddingLeft: 31, fontFamily: 'Poppins', fontWeight: '600'

    },
    field: {
        width: '90%',
        alignSelf: 'center',
        borderRadius: 10,
        height: 45,
        borderWidth: 0.8,
        borderColor: 'rgba(255,255,255,0.5)',
        paddingHorizontal: 10,
        marginVertical: 8,
        backgroundColor: 'rgba(19, 202, 214, 0.2)',
        color: '#000',
    },
    passwordField: {
        width: '90%',
        height: 45,
        alignSelf: 'center',
        borderRadius: 10,
        borderWidth: 0.8,
        borderColor: 'rgba(255,255,255,0.5)',
        marginVertical: 8,
        backgroundColor: 'rgba(19, 202, 214, 0.2)',
        flexDirection: 'row',
        alignItems: 'center',
    },
    passwordInput: {
        flex: 1,
        height: '100%',
        paddingLeft: 10,
        paddingRight: 44,
        color: '#000',
    },
    passwordToggle: {
        position: 'absolute',
        right: 0,
        width: 44,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    messageText: {
        width: '90%',
        color: grad1,
        fontSize: 13,
        fontWeight: '700',
        marginTop: 4,
        textAlign: 'center',
    },
    selectField: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectText: {
        flex: 1,
        color: '#000',
        marginRight: 8,
    },
    placeholderText: {
        color: 'rgba(19, 202, 214, 1)',
    },
    phoneRow: {
        width: '90%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    countryCodeField: {
        width: 116,
        marginVertical: 8,
        alignSelf: 'auto',
    },
    phoneField: {
        flex: 1,
        width: undefined,
        marginVertical: 8,
        alignSelf: 'auto',
    },
    modalBackdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    modalContent: {
        maxHeight: '80%',
        borderTopLeftRadius: 18,
        borderTopRightRadius: 18,
        paddingTop: 18,
        paddingHorizontal: 16,
        paddingBottom: 26,
        backgroundColor: '#E9F6FE',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    modalTitle: {
        color: '#252525',
        fontFamily: 'Poppins',
        fontSize: 18,
        fontWeight: '700',
    },
    searchField: {
        width: '100%',
        marginVertical: 10,
    },
    option: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(8, 81, 97, 0.16)',
        paddingVertical: 12,
        paddingHorizontal: 4,
    },
    selectedOption: {
        backgroundColor: 'rgba(19, 202, 214, 0.12)',
    },
    optionText: {
        flex: 1,
        color: '#252525',
        fontSize: 15,
        marginRight: 12,
    },
    emptyText: {
        color: '#252525',
        textAlign: 'center',
        paddingVertical: 24,
    },
    dateColumns: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    dateColumn: {
        flex: 1,
        minHeight: 240,
        maxHeight: 280,
    },
    dateColumnTitle: {
        color: grad1,
        fontFamily: 'Poppins',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    dateList: {
        borderRadius: 10,
        backgroundColor: 'rgba(19, 202, 214, 0.12)',
    },
    dateOption: {
        minHeight: 42,
        alignItems: 'center',
        justifyContent: 'center',
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(8, 81, 97, 0.12)',
    },
    dateDoneButton: {
        alignSelf: 'center',
        minWidth: '100%',
        marginTop: 2,
    },
    dateDonePressable: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateDoneText: {
        color: '#FFFFFF',
        fontFamily: 'Poppins',
        fontSize: 18,
        fontWeight: '800',
    },
    create: {
        color: '#fff',
        fontFamily: 'Poppins',
        lineHeight: 25,
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        height: 25,
        marginLeft: 10,
        width: '80%'
    },
    container: {
        flex: 1,
        justifyContent: 'flex-start',
        backgroundColor: '#E9F6FE',

    },
    // Slide styles
    slide: {
        flex: 1,
        width: '100%',
        // Take up all screen
        // Center horizontally
    },
    log: {
        flex: 1,
        width: '100%',
        maxWidth: 760,                    // Take up all screen
        justifyContent: 'flex-start',
        alignItems: 'center',       // Center horizontally

    },

    label: {
        color: '#fff'
    },
    input: {
        borderColor: '#fff',
        color: '#fff'
    },
    button: {
        width: 161,
        height: 48,
        maxHeight: 48,
        borderRadius: 10,
        borderWidth: 0,
        minWidth: '90%',
    },
    header: {
        color: '#ffffff',
        fontFamily: 'Montserrat-Regular',
        lineHeight: 25,
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        height: 25,
        marginTop: 5,
        marginBottom: 20,
    },
    header2: {
        color: '#333333',
        fontFamily: 'Montserrat-Regular',
        lineHeight: 25,
        height: 25,
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 5,
        marginBottom: 20,
    },
    // Text below header
    text: {
        color: '#C0C0C0',
        fontFamily: 'Lato-Regular',
        fontSize: 18,
        marginHorizontal: 40,
        textAlign: 'center',
    },
});
