import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

const Loading = ({ app, transparent }: any) => {
    return (
        <View style={{ flex: 1, flexDirection: 'column', justifyContent: 'center', backgroundColor: transparent ? 'transparent' : app.dark ? '#E9F6FE' : '#fff', }}>
            <ActivityIndicator size="large" color={transparent ? '#fff' : app.dark ? '#fff' : '#E9F6FE'} />
        </View>
    )
};

Loading.propTypes = {
    isDark: PropTypes.bool
};

Loading.defaultProps = {
    isDark: false
};
const mapStateToProps = (state: any) => ({
    app: state.app || {}
});

const mapDispatchToProps = {

};

export default connect(mapStateToProps, mapDispatchToProps)(Loading);
