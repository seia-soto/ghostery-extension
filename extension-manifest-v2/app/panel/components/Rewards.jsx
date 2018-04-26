/**
 * Rewards Component
 *
 * Ghostery Browser Extension
 * https://www.ghostery.com/
 *
 * Copyright 2018 Ghostery, Inc. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0
 */

import React, { Component } from 'react';
import { Link, Route } from 'react-router-dom';
import { ToggleSlider, RewardListItem, RewardDetail } from './BuildingBlocks';

/**
 * @class The Rewards Panel shows offers generated by Ghostery Rewards.
 * The panel is opened from a button in the Detailed View's footer.
 * See DetailMenu.jsx.
 * @memberof PanelClasses
 */
class Rewards extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			rewardsArray: null,
		};

		// event bindings
		this.toggleOffers = this.toggleOffers.bind(this);
		this.removeOffer = this.removeOffer.bind(this);

		this.renderRewardListComponent = this.renderRewardListComponent.bind(this);
		this.renderRewardDetailComponent = this.renderRewardDetailComponent.bind(this);
	}

	/**
	 * Lifecycle event
	 */
	componentDidMount() {
		this.props.actions.getRewardsData();
	}

	componentWillReceiveProps(nextProps) {
		const dateNow = new Date();
		let rewardsArray = null;
		if (nextProps.rewards) {
			rewardsArray = Object.keys(nextProps.rewards).map(key => {
				const reward = nextProps.rewards[key].offer_data;
				return {
					id: reward.offer_id,
					unread: false,
					code: reward.ui_info.template_data.code || 'C0D3_DNE',
					text: reward.ui_info.template_data.title || 'reward title',
					description: reward.ui_info.template_data.desc || 'reward description',
					expires: Math.round((new Date()).setDate(dateNow.getDate() + reward.expirationMs / 60/ 60 / 24)),
				};
			});
		}
		this.setState({ rewardsArray });
	}

	/**
	 * Handles toggling rewards on/off
	 */
	toggleOffers() {
		const { enable_offers } = this.props;
		this.props.actions.showNotification({
			text: `Ghostery Rewards is ${enable_offers ? 'OFF' : 'ON'}`,
			classes: 'purple',
		});
		this.props.actions.toggleOffersEnabled(!enable_offers);
	}

	/**
	 * Handles removing a reward from the Rewards array
	 * @param  {Int} id the ID of the reward
	 */
	removeOffer(id) {
		this.props.actions.removeOffer(id);
	}

	/**
	 * Helper render function for the Rewards Header
	 * @return {JSX} JSX for the Rewards Header
	 */
	renderRewardsHeader() {
		const { enable_offers, location } = this.props;
		const showBack = location.pathname.indexOf('/detail/rewards/detail') !== -1;
		const showToggle = location.pathname === '/detail/rewards/list';

		return (
			<div className="RewardsPanel__header flex-container align-center-middle">
				{showBack && (
					<Link to="/detail/rewards/list" className="RewardsPanel--send-left RewardsPanel--add-padding flex-container clickable">
						<svg height="18" width="12" fill="none" stroke="#4a4a4a" strokeWidth="3" strokeLinecap="round">
							<path d="M10,2L2,9L10,16" />
						</svg>
					</Link>
				)}
				<span className="RewardsPanel__title">{ t('panel_detail_rewards_title') }</span>
				{showToggle && (
					<span className="RewardsPanel--send-right flex-container align-middle">
						<span>{enable_offers ? 'ON ' : 'OFF '}</span>
						<ToggleSlider
							className="RewardsPanel--add-padding display-inline-block"
							isChecked={enable_offers}
							onChange={this.toggleOffers}
						/>
					</span>
				)}
			</div>
		);
	}

	/**
	 * Helper render function for the list of Rewards Items
	 * @return {JSX} JSX for the Rewards Items List
	 */
	renderRewardListComponent() {
		const { enable_offers } = this.props;
		const { rewardsArray } = this.state;

		if (enable_offers && !rewardsArray) {
			return <span>Loading Rewards ...</span>;
		} else if (enable_offers && rewardsArray.length === 0) {
			return <span>No Rewards Were Found</span>;
		} else if (!enable_offers && (!rewardsArray || rewardsArray.length === 0)) {
			return <span>Turn on Rewards to see great deals</span>;
		}

		const rewardsList = rewardsArray.map((reward, index) => (
			<RewardListItem
				disabled={!enable_offers}
				index={index}
				id={reward.id}
				key={reward.id}
				unread={reward.unread}
				text={reward.text}
				expires={reward.expires}
				clickCloseButton={this.removeOffer}
			/>
		));
		return <div className="RewardsPanel__scroll_content">{ rewardsList }</div>;
	}

	/**
	 * Helper render function for an individual Reward Item
	 * @return {JSX} JSX for the Rewards Detail Item
	 */
	renderRewardDetailComponent(routeProps) {
		const { id } = routeProps.match.params;
		const reward = this.state.rewardsArray.find(el => el.id === id);

		return (
			<RewardDetail
				id={reward.id}
				code={reward.code}
				description={reward.description}
				expires={reward.expires}
				actions={this.props.actions}
			/>
		);
	}

	/**
	 * React's required render function. Returns JSX
	 * @return {JSX} JSX for rendering the Rewards portion of the Detailed View
	 */
	render() {
		return (
			<div className="RewardsPanel">
				{this.renderRewardsHeader()}
				<Route path="/detail/rewards/list" render={this.renderRewardListComponent} />
				<Route path="/detail/rewards/detail/:id" render={this.renderRewardDetailComponent} />
			</div>
		);
	}
}

export default Rewards;
